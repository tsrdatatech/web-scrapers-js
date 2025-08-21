# Makefile for Universal Web Scraper

.PHONY: help install dev test lint format build docker clean

# Default target
help: ## Show this help message
	@echo "Universal Web Scraper - Available Commands"
	@echo "=========================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
install: ## Install dependencies
	npm install

dev: ## Start development mode with nodemon
	npm run dev

test: ## Run test suite
	npm run test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

# Code Quality
lint: ## Run ESLint
	npm run lint

lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

validate: ## Run all validation (lint + format + test)
	npm run validate

# Building
build: ## Build and validate the project
	npm run build

# Docker
docker-build: ## Build Docker image
	docker build -f docker/Dockerfile -t universal-web-scraper .

docker-run: ## Run Docker container
	docker-compose -f docker/docker-compose.yml up scraper

docker-dev: ## Run Docker compose for development
	docker-compose -f docker/docker-compose.yml --profile dev up --build

docker-test: ## Run Docker tests
	docker-compose -f docker/docker-compose.yml --profile test up scraper-test

docker-clean: ## Clean Docker images and containers
	docker-compose -f docker/docker-compose.yml down
	docker rmi universal-web-scraper 2>/dev/null || true

# Running
run: ## Run scraper with example URL
	npm start -- --url https://example.com --parser generic-news

run-seeds: ## Run scraper with seeds file
	npm start -- --file seeds.txt --parser auto

run-weibo: ## Run scraper for Weibo content
	npm start -- --url https://weibo.com/example --parser weibo

# Cleanup
clean: ## Clean temporary files and dependencies
	rm -rf node_modules/
	rm -rf coverage/
	rm -rf storage/
	rm -f npm-debug.log*
	rm -f .eslintcache

clean-all: clean docker-clean ## Clean everything including Docker

# CI/CD
ci: ## Run CI pipeline locally
	npm run validate
	npm run test:ci

# Security
audit: ## Run security audit
	npm audit
	npx audit-ci --high

# --------------------------------------------------
# Operations & Orchestration (Kubernetes / Image Ops)
# --------------------------------------------------

# Configurable variables (override via `make VAR=value`)
IMAGE ?= universal-web-scraper
IMAGE_TAG ?= $(shell git rev-parse --short HEAD)
NAMESPACE ?= web-scraper
PARSER ?= generic-news
SEED_FILE ?= seeds-generic-news.txt
MAX_CONCURRENCY ?= 2
JOB_NAME ?= manual-$(PARSER)-$(shell date +%s)

.PHONY: image-build image-run kind-load minikube-load k8s-dry-run k8s-namespace k8s-cron-apply k8s-job-template k8s-cron-delete job-run-dry job-run job-run-direct job-logs job-summary jobs-clean nuke

# Image build & local run
image-build: ## Build multi-tag image (latest + git SHA)
	docker build -f docker/Dockerfile -t $(IMAGE):latest -t $(IMAGE):$(IMAGE_TAG) .

image-run: ## Run image locally in DRY_RUN mode
	DRY_RUN=true docker run --rm $(IMAGE):latest --parser=$(PARSER) --seed-file=$(SEED_FILE) --max-concurrency=$(MAX_CONCURRENCY)

kind-load: image-build ## Load image into kind cluster (if exists)
	kind load docker-image $(IMAGE):latest || echo "kind cluster not found"

minikube-load: image-build ## Load image into minikube (if exists)
	minikube image load $(IMAGE):latest || echo "minikube not found"

# Kubernetes validation & apply
k8s-dry-run: ## Client-side dry-run validate all manifests
	kubectl apply --dry-run=client -f k8s/

k8s-namespace: ## Apply namespace & configmap
	kubectl apply -f k8s/namespace.yaml -f k8s/configmap.yaml

k8s-cron-apply: k8s-namespace ## Apply CronJobs (generic-news, weibo)
	kubectl apply -f k8s/cron-generic-news.yaml -f k8s/cron-weibo.yaml

k8s-job-template: ## Apply generic Job template
	kubectl apply -f k8s/job-template.yaml

k8s-cron-delete: ## Delete CronJobs (safe if missing)
	kubectl delete cronjob web-scraper-generic-news web-scraper-weibo -n $(NAMESPACE) || true

# Ad-hoc Jobs (safe defaults)
job-run-dry: ## Generate Job from Cron (dry-run -> apply)
	kubectl create job $(JOB_NAME) --from=cronjob/web-scraper-$(PARSER) -n $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -

job-run: ## Create Job from Cron (actual)
	kubectl create job $(JOB_NAME) --from=cronjob/web-scraper-$(PARSER) -n $(NAMESPACE)

job-run-direct: ## Create Job with explicit args (defaults DRY_RUN=true)
	kubectl create job $(JOB_NAME) -n $(NAMESPACE) --image=$(IMAGE):latest -- \
	  env DRY_RUN=true node src/index.js --parser=$(PARSER) --seed-file=$(SEED_FILE) --max-concurrency=$(MAX_CONCURRENCY)

job-logs: ## Tail logs for first pod of JOB_NAME
	kubectl logs -f -n $(NAMESPACE) $$(kubectl get pod -n $(NAMESPACE) -l job-name=$(JOB_NAME) -o jsonpath='{.items[0].metadata.name}')

job-summary: ## Extract run_summary lines for JOB_NAME
	kubectl logs -n $(NAMESPACE) -l job-name=$(JOB_NAME) | jq 'select(.event=="run_summary")'

jobs-clean: ## Delete successful Jobs
	kubectl delete job -n $(NAMESPACE) $$(kubectl get jobs -n $(NAMESPACE) --field-selector status.successful=1 -o name | cut -d/ -f2) || true

nuke: ## Delete entire namespace (DANGER)
	kubectl delete namespace $(NAMESPACE) --ignore-not-found
