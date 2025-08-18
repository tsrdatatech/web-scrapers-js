import { pinoLogger } from './logger.js'

export async function enqueueLinks({ ctx, depth, parser }) {
  const { enqueueLinks, request } = ctx
  const nextDepth = depth + 1

  try {
    await enqueueLinks({
      strategy: 'same-domain',
      globs:
        parser.domains && parser.domains.length
          ? parser.domains.map(d => `https://*${d}/*`)
          : undefined,
      userData: { depth: nextDepth, parser: parser.id },
      forefront: false,
    })
  } catch (err) {
    pinoLogger.warn({ url: request.url, err }, 'enqueueLinks failed')
  }
}
