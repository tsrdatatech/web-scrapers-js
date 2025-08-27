import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseLine(line) {
  line = line.trim()
  if (!line || line.startsWith('#')) return null

  // JSON object line: {url: "...", label: "selector", parser: "parser-id"}
  if (line.startsWith('{') && line.endsWith('}')) {
    try {
      // First try parsing as-is (in case it's already valid JSON)
      const obj = JSON.parse(line)
      if (!obj.url) return null
      return obj
    } catch {
      try {
        // If that fails, try converting object notation to proper JSON
        const normalized = line
          .replace(/(\w+):/g, '"$1":') // quote keys
          .replace(/'/g, '"') // single to double quotes
        const obj = JSON.parse(normalized)
        if (!obj.url) return null
        return obj
      } catch {
        return null
      }
    }
  }

  // Plain URL
  if (/^https?:\/\//i.test(line)) {
    return { url: line, parser: 'generic-news' }
  }

  return null
}

export async function resolveSeeds(options = {}) {
  const { url, file, storage, parser } = options

  // Priority 1: Direct URL
  if (url) {
    return [{ url, parser: parser || 'generic-news' }]
  }

  // Priority 2: Cassandra storage
  if (storage && storage.seeds) {
    try {
      const seeds = await storage.seeds.getSeedUrls(parser || 'generic-news', {
        limit: options.limit || 100,
        minPriority: options.minPriority || 1,
        maxPriority: options.maxPriority || 5,
      })

      if (seeds.length > 0) {
        return seeds
      }
    } catch (error) {
      console.warn(
        'Failed to load seeds from Cassandra, falling back to file:',
        error.message
      )
    }
  }

  // Priority 3: File fallback
  if (file) {
    const seedPath = join(__dirname, '..', '..', file)
    const content = readFileSync(seedPath, 'utf-8')
    const lines = content.split('\n')
    const seeds = lines.map(parseLine).filter(Boolean)

    // Apply parser override if provided
    if (parser) {
      seeds.forEach(seed => {
        seed.parser = parser
      })
    }

    return seeds
  }

  throw new Error('No seed source provided (url, storage, or file)')
}
