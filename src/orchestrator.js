import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import k8s from '@kubernetes/client-node'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
})

// Configuration
const config = {
  batchSize: parseInt(process.env.BATCH_SIZE || '5', 10),
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '20', 10),
  jobTimeout: parseInt(process.env.JOB_TIMEOUT || '600', 10),
  namespace: process.env.NAMESPACE || 'web-scraper',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '10000', 10), // 10s
  parser: process.env.PARSER || 'generic-news',
  seedFile: process.env.SEED_FILE || 'seeds-generic-news.txt',
}

// Kubernetes client setup
const kc = new k8s.KubeConfig()
kc.loadFromDefault()
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api)

class BatchOrchestrator {
  constructor() {
    this.activeJobs = new Map() // jobName -> { urls: [], status: 'running'|'completed'|'failed', startTime: Date }
    this.urlQueue = []
    this.completedBatches = []
    this.failedBatches = []
    this.isRunning = false
  }

  // Load URLs from seed file and chunk into batches
  loadAndBatchUrls() {
    try {
      const seedPath = join(__dirname, '..', config.seedFile)
      const content = readFileSync(seedPath, 'utf-8')
      const urls = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))

      logger.info(
        { urlCount: urls.length, batchSize: config.batchSize },
        'Loading URLs'
      )

      // Chunk URLs into batches
      const batches = []
      for (let i = 0; i < urls.length; i += config.batchSize) {
        batches.push(urls.slice(i, i + config.batchSize))
      }

      this.urlQueue = batches
      logger.info(
        {
          totalUrls: urls.length,
          batchCount: batches.length,
          batchSize: config.batchSize,
        },
        'URLs batched for processing'
      )

      return batches.length
    } catch (error) {
      logger.error(
        { error: error.message, seedFile: config.seedFile },
        'Failed to load seed file'
      )
      throw error
    }
  }

  // Create a Kubernetes Job for a batch of URLs
  async createBatchJob(batchId, urls) {
    const jobName = `scraper-batch-${batchId}-${Date.now()}`

    const jobSpec = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
        namespace: config.namespace,
        labels: {
          app: 'web-scraper',
          'batch-id': batchId.toString(),
          'orchestrator-managed': 'true',
        },
      },
      spec: {
        ttlSecondsAfterFinished: 300, // Clean up after 5 minutes
        activeDeadlineSeconds: config.jobTimeout,
        backoffLimit: 2,
        template: {
          metadata: {
            labels: {
              app: 'web-scraper',
              'batch-id': batchId.toString(),
            },
          },
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name: 'scraper',
                image: 'web-scraper:latest',
                command: ['node', 'src/index.js'],
                args: [
                  '--parser',
                  config.parser,
                  '--urls',
                  urls.join(','),
                  '--max-concurrency',
                  '2', // Lower per-job concurrency since we have many parallel jobs
                ],
                env: [
                  {
                    name: 'DRY_RUN',
                    value: process.env.DRY_RUN || 'false',
                  },
                ],
                resources: {
                  requests: {
                    memory: '256Mi',
                    cpu: '100m',
                  },
                  limits: {
                    memory: '512Mi',
                    cpu: '500m',
                  },
                },
                securityContext: {
                  runAsNonRoot: true,
                  runAsUser: 1001,
                  readOnlyRootFilesystem: true,
                  allowPrivilegeEscalation: false,
                },
                volumeMounts: [
                  {
                    name: 'temp',
                    mountPath: '/tmp',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'temp',
                emptyDir: {},
              },
            ],
          },
        },
      },
    }

    try {
      await batchV1Api.createNamespacedJob(config.namespace, jobSpec)

      this.activeJobs.set(jobName, {
        urls,
        status: 'running',
        startTime: new Date(),
        batchId,
      })

      logger.info(
        {
          jobName,
          batchId,
          urlCount: urls.length,
        },
        'Created batch job'
      )

      return jobName
    } catch (error) {
      logger.error(
        {
          error: error.message,
          jobName,
          batchId,
        },
        'Failed to create batch job'
      )
      throw error
    }
  }

  // Monitor active jobs and update status
  async monitorJobs() {
    const activeJobNames = Array.from(this.activeJobs.keys())

    if (activeJobNames.length === 0) {
      return
    }

    try {
      const { body: jobs } = await batchV1Api.listNamespacedJob(
        config.namespace,
        undefined, // pretty
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        'orchestrator-managed=true' // labelSelector
      )

      for (const job of jobs.items) {
        const jobName = job.metadata.name
        const jobInfo = this.activeJobs.get(jobName)

        if (!jobInfo || jobInfo.status !== 'running') {
          continue
        }

        const conditions = job.status.conditions || []
        const completedCondition = conditions.find(c => c.type === 'Complete')
        const failedCondition = conditions.find(c => c.type === 'Failed')

        if (completedCondition && completedCondition.status === 'True') {
          jobInfo.status = 'completed'
          jobInfo.endTime = new Date()
          this.completedBatches.push(jobInfo)

          logger.info(
            {
              jobName,
              batchId: jobInfo.batchId,
              duration: jobInfo.endTime - jobInfo.startTime,
              urlCount: jobInfo.urls.length,
            },
            'Batch job completed successfully'
          )
        } else if (failedCondition && failedCondition.status === 'True') {
          jobInfo.status = 'failed'
          jobInfo.endTime = new Date()
          jobInfo.reason = failedCondition.reason
          this.failedBatches.push(jobInfo)

          logger.error(
            {
              jobName,
              batchId: jobInfo.batchId,
              reason: failedCondition.reason,
              message: failedCondition.message,
              urlCount: jobInfo.urls.length,
            },
            'Batch job failed'
          )
        }
      }

      // Clean up completed/failed jobs from active tracking
      for (const [jobName, jobInfo] of this.activeJobs.entries()) {
        if (jobInfo.status === 'completed' || jobInfo.status === 'failed') {
          this.activeJobs.delete(jobName)
        }
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to monitor jobs')
    }
  }

  // Get current orchestration status
  getStatus() {
    const runningJobs = Array.from(this.activeJobs.values()).filter(
      j => j.status === 'running'
    )

    return {
      isRunning: this.isRunning,
      queuedBatches: this.urlQueue.length,
      runningJobs: runningJobs.length,
      completedBatches: this.completedBatches.length,
      failedBatches: this.failedBatches.length,
      totalProcessed: this.completedBatches.length + this.failedBatches.length,
      activeJobs: runningJobs.map(j => ({
        batchId: j.batchId,
        urlCount: j.urls.length,
        runtime: Date.now() - j.startTime.getTime(),
      })),
    }
  }

  // Main orchestration loop
  async run() {
    logger.info(config, 'Starting batch orchestrator')

    try {
      const batchCount = this.loadAndBatchUrls()
      if (batchCount === 0) {
        logger.warn('No URL batches to process')
        return
      }

      this.isRunning = true
      let batchId = 0

      // Main processing loop
      while (this.urlQueue.length > 0 || this.activeJobs.size > 0) {
        // Start new jobs if we have capacity and queued batches
        while (
          this.activeJobs.size < config.maxConcurrentJobs &&
          this.urlQueue.length > 0
        ) {
          const batch = this.urlQueue.shift()
          await this.createBatchJob(++batchId, batch)

          // Small delay to avoid overwhelming the API server
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Monitor existing jobs
        await this.monitorJobs()

        // Log status periodically
        const status = this.getStatus()
        logger.info(status, 'Orchestration status')

        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, config.pollInterval))
      }

      // Final status
      const finalStatus = this.getStatus()
      logger.info(finalStatus, 'Batch orchestration completed')

      // Summary metrics
      const totalUrls =
        this.completedBatches.reduce(
          (sum, batch) => sum + batch.urls.length,
          0
        ) +
        this.failedBatches.reduce((sum, batch) => sum + batch.urls.length, 0)

      const successRate =
        totalUrls > 0
          ? (
              (this.completedBatches.reduce(
                (sum, batch) => sum + batch.urls.length,
                0
              ) /
                totalUrls) *
              100
            ).toFixed(2)
          : 0

      logger.info(
        {
          event: 'orchestration_summary',
          totalBatches:
            this.completedBatches.length + this.failedBatches.length,
          completedBatches: this.completedBatches.length,
          failedBatches: this.failedBatches.length,
          totalUrls,
          successRate: parseFloat(successRate),
          config,
        },
        'Orchestration summary'
      )
    } catch (error) {
      logger.error({ error: error.message }, 'Orchestration failed')
      throw error
    } finally {
      this.isRunning = false
    }
  }
}

// Signal handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Start orchestrator
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new BatchOrchestrator()
  orchestrator.run().catch(error => {
    logger.error({ error: error.message }, 'Orchestrator failed')
    process.exit(1)
  })
}

export default BatchOrchestrator
