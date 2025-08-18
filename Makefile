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
