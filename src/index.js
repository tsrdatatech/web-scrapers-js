import 'dotenv/config'
import { PlaywrightCrawler } from 'crawlee'
import { createParserRegistry } from './core/parser-registry.js'
import { createParserManager } from './core/parser-select.js'
import { buildRouter } from './routes.js'
import { resolveSeeds } from './core/seeds.js'
import { crawleeLog } from './core/logger.js'
import { createProxyConfiguration } from './core/proxy-config.js'

async function main() {
  const seedFile = process.env.SEEDS_FILE || 'seeds.txt'
  const registry = await createParserRegistry()
  const manager = createParserManager(registry)
  const router = buildRouter({ registry, manager })
  const seeds = await resolveSeeds({ file: seedFile })

  const proxyConfiguration = await createProxyConfiguration()

  if (proxyConfiguration) {
    crawleeLog.info('Proxy configuration enabled')
  }

  const crawlerOptions = {
    log: crawleeLog,
    requestHandler: router,
    maxConcurrency: process.env.MAX_CONCURRENCY
      ? Number(process.env.MAX_CONCURRENCY)
      : 2,
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
      crawleeLog.error(`Request failed for ${request.url}: ${error.message}`)
    },
  }

  // Only add proxy configuration if it's not null
  if (proxyConfiguration) {
    crawlerOptions.proxyConfiguration = proxyConfiguration
  }

  const crawler = new PlaywrightCrawler(crawlerOptions)

  await crawler.run(
    seeds.map(seed => ({
      url: seed.url,
      userData: { parser: seed.parser },
      label: seed.label,
    }))
  )
}

main().catch(console.error)
