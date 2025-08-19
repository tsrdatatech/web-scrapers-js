# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the Universal Web Scraper.

## Quick Start

1. **Apply all manifests:**

   ```bash
   kubectl apply -f k8s/
   ```

2. **Check deployment status:**

   ```bash
   kubectl get pods -n web-scraper
   kubectl logs -f deployment/web-scraper -n web-scraper
   ```

3. **Test the service:**
   ```bash
   kubectl port-forward svc/web-scraper-service 8080:80 -n web-scraper
   ```

## Files

- `namespace.yaml` - Creates isolated namespace for the scraper
- `configmap.yaml` - Environment configuration (non-sensitive)
- `deployment.yaml` - Main application deployment with health checks
- `service.yaml` - Internal service for pod communication

## Configuration

Edit `configmap.yaml` to modify:

- Log levels
- Default parser settings
- Concurrency limits
- Other environment variables

## Scaling

Scale the deployment:

```bash
kubectl scale deployment web-scraper --replicas=3 -n web-scraper
```

## Cleanup

Remove all resources:

```bash
kubectl delete namespace web-scraper
```
