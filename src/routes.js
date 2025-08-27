import { createPlaywrightRouter } from 'crawlee'
import { pinoLogger } from './core/logger.js'

export function buildRouter({ registry: _registry, manager, storage }) {
  const router = createPlaywrightRouter()

  // Default handler: enqueue links from start URLs using provided selector
  router.addDefaultHandler(async ({ request, enqueueLinks, log }) => {
    const selector = request.label

    if (!selector) {
      log.warn(
        `No selector provided for ${request.url} - skipping link discovery`
      )
      return
    }

    log.info(
      `Discovering links from ${request.url} using selector: ${selector}`
    )
    await enqueueLinks({
      selector,
      label: 'PARSE',
      transformRequestFunction: req => ({
        ...req,
        userData: { parser: request.userData?.parser },
      }),
    })
  })

  // Parse handler: extract content using appropriate parser
  router.addHandler('PARSE', async ({ request, page, log }) => {
    const parser = await manager.selectParser({
      url: request.url,
      forcedId: request.userData?.parser,
    })

    if (!parser) {
      log.debug(`No parser available for ${request.url}`)
      return
    }

    try {
      const result = await parser.parse(page, { request, page, log, parser })
      if (result) {
        // Store in Cassandra if available
        let storeResult = null
        if (storage && storage.articles) {
          try {
            storeResult = await storage.articles.storeArticle({
              ...result,
              parser_id: parser.id,
              url: request.url,
            })
          } catch (storageError) {
            log.error(
              { err: storageError },
              'Failed to store article in database'
            )
          }
        }

        const dataLogger = pinoLogger.child({
          event: 'parsed',
          parser: parser.id,
          ...(storeResult || {}),
        })

        dataLogger.info({
          url: request.url,
          data: result,
          ...(storeResult
            ? {
                stored: true,
                changeType: storeResult.changeType,
                urlHash: storeResult.urlHash,
              }
            : { stored: false }),
        })
      }
    } catch (err) {
      pinoLogger.error(
        { err, parser: parser.id, url: request.url },
        'Parse failed'
      )
    }
  })

  return router
}
