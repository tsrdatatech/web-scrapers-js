import { pinoLogger } from './logger.js'
import { extract } from '@extractus/article-extractor'

class ParserManager {
  constructor(registry) {
    this.registry = registry
  }

  async selectParser({ url, forcedId }) {
    // If a specific parser is requested, use it
    if (forcedId) {
      const forced = this.registry.get(forcedId)
      if (!forced) pinoLogger.warn({ forcedId }, 'Forced parser not found')
      return forced
    }

    // Try each parser's canParse method
    for (const parser of this.registry.all()) {
      try {
        if (await parser.canParse(url)) return parser
      } catch (err) {
        pinoLogger.warn({ parser: parser.id, err }, 'canParse error')
      }
    }

    // Fallback: try article extraction -> generic-news
    const generic = this.registry.get('generic-news')
    if (generic) {
      try {
        const art = await extract(url)
        if (art && art.title) return generic
      } catch {}
    }

    return null
  }
}

export function createParserManager(registry) {
  return new ParserManager(registry)
}

// Legacy export for backward compatibility
export async function selectParser({ url, registry, forcedId }) {
  const manager = new ParserManager(registry)
  return manager.selectParser({ url, forcedId })
}
