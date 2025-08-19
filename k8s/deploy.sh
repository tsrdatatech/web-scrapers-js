#!/bin/bash

# Simple script to build Docker image and deploy to local Kubernetes
# Requires: Docker, kubectl, and a local Kubernetes cluster (minikube, kind, or Docker Desktop)

set -e

echo "🐳 Building Docker image..."
docker build -f docker/Dockerfile -t universal-web-scraper:latest .

echo "☸️  Applying Kubernetes manifests..."
kubectl apply -f k8s/

echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/web-scraper -n web-scraper

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status:"
echo "  kubectl get pods -n web-scraper"
echo ""
echo "📝 View logs:"
echo "  kubectl logs -f deployment/web-scraper -n web-scraper"
echo ""
echo "🌐 Port forward to test:"
echo "  kubectl port-forward svc/web-scraper-service 8080:80 -n web-scraper"
