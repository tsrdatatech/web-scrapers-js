# Kubernetes Orchestrated Scraper (Jobs, CronJobs & Batch Orchestrator)

This directory showcases multiple Kubernetes patterns for the Universal Web Scraper:

1. **CronJobs** - Scheduled scraping (hourly, daily, etc.)
2. **Ad-hoc Jobs** - Manual runs with custom parameters
3. **Batch Orchestrator** - High-scale URL processing mimicking AWS Step Functions + Batch
4. **Cassandra Integration** - NoSQL storage for seeds and article persistence with deduplication

## Deployment Options

### Option A: File-Based Seeds (Original)

Uses text files for seed URLs and logs output to stdout.

### Option B: Cassandra-Powered Storage

Uses Cassandra database for:

- **Seed Management**: Priority-based URL retrieval, deactivation, statistics
- **Article Storage**: Deduplication, change tracking, metrics collection
- **Analytics**: Time-series data for scraping insights

## Quick Start Options

### Option A: CronJobs (File-Based Seeds)

```bash
# Deploy namespace, config, and CronJobs
kubectl apply -f k8s/namespace.yaml -f k8s/configmap.yaml \
   -f k8s/cron-generic-news.yaml -f k8s/cron-weibo.yaml

# Trigger manual run
kubectl create job --from=cronjob/web-scraper-generic-news manual-generic-$(date +%s) -n web-scraper

# Monitor
kubectl get jobs,pods -n web-scraper
```

### Option B: Cassandra-Powered Storage

```bash
# 1. Deploy Cassandra StatefulSet
kubectl apply -f k8s/cassandra-statefulset.yaml

# 2. Wait for Cassandra to be ready
kubectl wait --for=condition=ready pod/cassandra-0 -n web-scrapers --timeout=300s

# 3. Populate initial seed data
node scripts/cassandra-utils.js seed

# 4. Deploy scraper components with Cassandra integration
kubectl apply -f k8s/namespace.yaml -f k8s/configmap.yaml \
   -f k8s/cron-generic-news.yaml -f k8s/cron-weibo.yaml

# 5. Monitor database statistics
node scripts/cassandra-utils.js status
```

### Option C: Batch Orchestrator (High-Scale)

```bash
# Deploy orchestrator (automatically processes thousands of URLs)
kubectl apply -f k8s/namespace.yaml -f k8s/configmap.yaml -f k8s/batch-orchestrator.yaml

# The orchestrator automatically:
# - Loads URLs from seed file
# - Batches into groups of 5 URLs per job
# - Manages up to 20 concurrent jobs
# - Monitors pass/fail status like Step Functions
# - Provides comprehensive metrics and retry logic

# Monitor orchestration
kubectl logs -f deployment/batch-orchestrator -n web-scraper
```

## Files

- `namespace.yaml` - Isolated namespace
- `configmap.yaml` - Non-sensitive defaults (log level, default parser, concurrency)
- `job-template.yaml` - Generic ad-hoc Job you can reuse
- `cron-generic-news.yaml` - Hourly run for generic news parser
- `cron-weibo.yaml` - Twice daily (every 12h) run for weibo parser
- `deployment.yaml` & `service.yaml` - (Legacy / Optional) Deployment pattern; Jobs & CronJobs are primary now
- `cassandra-statefulset.yaml` - Cassandra database for persistent storage

## Cassandra Integration

The scraper supports Cassandra for sophisticated data management:

### Storage Components

1. **Seed Manager** (`src/storage/seed-manager.js`)
   - Priority-based URL retrieval
   - Parser-specific seed organization
   - Deactivation tracking and statistics

2. **Article Storage** (`src/storage/article-storage.js`)
   - Content deduplication via hashing
   - Change detection and versioning
   - Time-series metrics collection

3. **Analytics Support**
   - Duplicate detection statistics
   - Domain-wise article counts
   - Historical scraping metrics

### Cassandra Tables

```cql
-- Seed URLs with priority and metadata
seeds_by_parser (parser_id, priority, url_hash, url, ...)

-- Articles with deduplication
articles_by_domain (domain, created_date, url_hash, ...)
articles_by_parser (parser_id, created_date, url_hash, ...)

-- Change tracking
article_changes (domain, url_hash, change_date, ...)

-- Metrics for analytics
scraper_metrics (parser_id, date, hour, metric_type, ...)
```

### Database Commands

```bash
# Development (Docker)
make cassandra-dev              # Start Cassandra locally
make cassandra-seed             # Populate initial data
make cassandra-status           # View statistics
make cassandra-client          # Connect to CQL shell

# Kubernetes
make cassandra-k8s             # Deploy to cluster
make cassandra-k8s-shell       # Connect to K8s CQL shell
make cassandra-k8s-logs        # View Cassandra logs
```

### Seed Resolution Priority

The scraper uses a three-tier approach for seed URLs:

1. **Direct URLs** - CLI `--urls` parameter (highest priority)
2. **Cassandra Database** - Priority-ordered URLs from database
3. **Text Files** - Fallback to `seeds-{parser}.txt` files

This allows seamless migration from file-based to database-driven seed management.

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

## Safe Demonstration (DRY_RUN)

Set `DRY_RUN=true` to skip real network crawling and just log up to 5 planned seeds while still producing a run summary:

```bash
kubectl create job demo-dryrun --image=universal-web-scraper:latest -n web-scraper -- \
  env DRY_RUN=true node src/index.js --parser=generic-news --seed-file=seeds-generic-news.txt
```

Summary log will include `"dryRun": true` and an extra `event="dry_run"` line.

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
