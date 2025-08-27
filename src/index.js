import 'dotenv/config'
import { PlaywrightCrawler } from 'crawlee'
import { createParserRegistry } from './core/parser-registry.js'
import { createParserManager } from './core/parser-select.js'
import { buildRouter } from './routes.js'
import { resolveSeeds } from './core/seeds.js'
import { crawleeLog } from './core/logger.js'
import { createProxyConfiguration } from './core/proxy-config.js'

function parseArgs(argv) {
  const args = {}
  for (const a of argv) {
    if (a.startsWith('--parser=')) {
      args.parser = a.split('=')[1]
    } else if (a.startsWith('--seed-file=')) {
      args.seedFile = a.split('=')[1]
    } else if (a.startsWith('--urls=')) {
      args.urls = a
        .split('=')[1]
        .split(',')
        .map(url => url.trim())
    } else if (a.startsWith('--max-concurrency=')) {
      const v = Number(a.split('=')[1])
      if (!Number.isNaN(v)) args.maxConcurrency = v
    }
  }
  return args
}

async function main() {
  const cli = parseArgs(process.argv)
  const registry = await createParserRegistry()
  const manager = createParserManager(registry)

  // Initialize storage (Cassandra if configured)
  let storage = null
  if (process.env.CASSANDRA_ENABLED === 'true' || process.env.CASSANDRA_HOSTS) {
    try {
      const { StorageFactory } = await import('./storage/index.js')
      const storageFactory = new StorageFactory()
      storage = await storageFactory.createCassandraStorage()
      crawleeLog.info('Cassandra storage initialized')
    } catch (error) {
      crawleeLog.warn(
        { error: error.message },
        'Failed to initialize Cassandra, using file-based seeds'
      )
    }
  }

  const router = buildRouter({ registry, manager, storage })

  let seeds

  // Support direct URL list or seed file
  if (cli.urls && cli.urls.length > 0) {
    // Create seeds from URL list
    seeds = cli.urls.map(url => ({
      url,
      parser: cli.parser || process.env.DEFAULT_PARSER || 'generic-news',
    }))
    crawleeLog.info(
      { urlCount: seeds.length, parser: seeds[0].parser },
      'Using URLs from command line'
    )
  } else {
    // Load from Cassandra or seed file
    seeds = await resolveSeeds({
      file:
        cli.seedFile ||
        process.env.SEED_FILE ||
        process.env.SEEDS_FILE ||
        'seeds.txt',
      storage,
      parser: cli.parser,
    })

    // If parser override provided, apply to all seeds without a parser
    if (cli.parser) {
      for (const s of seeds) {
        s.parser = cli.parser
      }
    }
  }
  const proxyConfiguration = await createProxyConfiguration()

  if (proxyConfiguration) {
    crawleeLog.info('Proxy configuration enabled')
  }

  const effectiveConcurrency =
    cli.maxConcurrency ||
    (process.env.MAX_CONCURRENCY ? Number(process.env.MAX_CONCURRENCY) : 2)

  const metrics = {
    startedAt: Date.now(),
    pagesTotal: 0,
    failures: 0,
  }

  const crawlerOptions = {
    log: crawleeLog,
    requestHandler: router,
    maxConcurrency: effectiveConcurrency,
    requestHandlerTimeoutSecs: 120,
    preNavigationHooks: [
      async ({ request: _request, page }, _gotoOptions) => {
        // Add random delay for politeness
        const delay = 500 + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))

        // Set user agent
        await page.setExtraHTTPHeaders({
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        })
      },
    ],
    failedRequestHandler: async ({ request, error }) => {
      metrics.failures++
      crawleeLog.error(`Request failed for ${request.url}: ${error.message}`)
    },
  }

  // Only add proxy configuration if it's not null
  if (proxyConfiguration) {
    crawlerOptions.proxyConfiguration = proxyConfiguration
  }

  const crawler = new PlaywrightCrawler(crawlerOptions)
  if (process.env.DRY_RUN === 'true') {
    crawleeLog.info(
      { event: 'dry_run', seedCount: seeds.length, seeds: seeds.slice(0, 5) },
      'DRY_RUN enabled – skipping network crawling (showing up to 5 seeds)'
    )
  } else {
    await crawler.run(
      seeds.map(seed => ({
        url: seed.url,
        userData: { parser: seed.parser },
        label: seed.label,
      }))
    )
  }

  metrics.pagesTotal = seeds.length // simplistic; could be improved with router instrumentation
  const durationMs = Date.now() - metrics.startedAt
  crawleeLog.info(
    {
      event: 'run_summary',
      pagesTotal: metrics.pagesTotal,
      failures: metrics.failures,
      durationMs,
      parserOverride: cli.parser || null,
      sourceType: cli.urls ? 'urls' : 'file',
      sourceFile: cli.urls
        ? null
        : cli.seedFile ||
          process.env.SEED_FILE ||
          process.env.SEEDS_FILE ||
          'seeds.txt',
      maxConcurrency: effectiveConcurrency,
      dryRun: process.env.DRY_RUN === 'true',
    },
    'Run summary'
  )
}

main().catch(console.error)
