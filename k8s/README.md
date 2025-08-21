# Kubernetes Orchestrated Scraper (Jobs & CronJobs)

This directory showcases multiple Kubernetes patterns (Namespace, ConfigMap, on-demand Job, scheduled CronJobs, optional Deployment) for the Universal Web Scraper.

## Quick Start (Local Cluster)

```bash
# Create / update namespace + config + scheduled jobs
kubectl apply -f k8s/namespace.yaml -f k8s/configmap.yaml \
   -f k8s/cron-generic-news.yaml -f k8s/cron-weibo.yaml

# (Optional) Apply job template for ad-hoc runs
kubectl apply -f k8s/job-template.yaml

# Trigger a one-off run overriding env/args
kubectl create job --from=cronjob/web-scraper-generic-news manual-generic-$(date +%s) -n web-scraper

# Watch
kubectl get jobs,pods -n web-scraper
```

## Files

- `namespace.yaml` - Isolated namespace
- `configmap.yaml` - Non-sensitive defaults (log level, default parser, concurrency)
- `job-template.yaml` - Generic ad-hoc Job you can reuse
- `cron-generic-news.yaml` - Hourly run for generic news parser
- `cron-weibo.yaml` - Twice daily (every 12h) run for weibo parser
- `deployment.yaml` & `service.yaml` - (Legacy / Optional) Deployment pattern; Jobs & CronJobs are primary now

## Configuration & Overrides

Priority order for parser & concurrency:

1. CLI args: `--parser=... --max-concurrency=... --seed-file=...`
2. Pod env vars (`PARSER`, `MAX_CONCURRENCY`, `SEED_FILE`)
3. ConfigMap defaults (`DEFAULT_PARSER`, `MAX_CONCURRENCY`)
4. Built-in code defaults (parser from seeds, concurrency=2)

Seeds:

- `seeds.txt` (baseline) plus parser-specific: `seeds-generic-news.txt`, `seeds-weibo.txt`.
  CronJobs refer to the parser-specific seed files.

## Scheduling & Scaling

- CronJob policies prevent overlapping runs (`concurrencyPolicy: Forbid`).
- Adjust schedules in the spec; e.g. run every 15 minutes: `*/15 * * * *`.
- Increase parallelism by raising `--max-concurrency` (watch memory use due to headless browsers).
- For continuous service mode, convert to a Deployment (already provided) and optionally add an HTTP health endpoint.

## Run Summary Logging

Each run emits a structured JSON summary log line with `event=run_summary` (pages, failures, duration, parser, concurrency). Example extraction:

```bash
kubectl logs job/<job-name> -n web-scraper | jq 'select(.event=="run_summary")'
```

## Cleanup

Remove everything (fastest):

```bash
kubectl delete namespace web-scraper --ignore-not-found
```

Or selectively delete CronJobs:

```bash
kubectl delete cronjob web-scraper-generic-news web-scraper-weibo -n web-scraper
```

## Future Enhancements (Not Implemented Here)

- Prometheus scraping of metrics endpoint (add server mode).
- NetworkPolicy to restrict egress except target news domains.
- Secrets for proxy credentials (referenced via envFrom).
- HorizontalPodAutoscaler for a queue-backed continuous crawler.
