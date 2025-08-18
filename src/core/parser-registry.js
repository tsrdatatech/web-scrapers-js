import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { pinoLogger } from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ParserRegistry {
  constructor() {
    this.parsers = new Map()
  }

  register(parser) {
    this.parsers.set(parser.id, parser)
    pinoLogger.info({ parser: parser.id }, 'Registered parser')
  }

  get(id) {
    return this.parsers.get(id)
  }

  all() {
    return [...this.parsers.values()]
  }
}

export async function createParserRegistry() {
  const registry = new ParserRegistry()
  const parsersDir = path.resolve(__dirname, '../parsers')
  const entries = await fs.readdir(parsersDir)

  for (const file of entries) {
    if (!file.endsWith('.js')) continue
    const full = path.join(parsersDir, file)
    try {
      const mod = await import(pathToFileURL(full))
      const ParserClass = mod.default
      const instance = new ParserClass()
      registry.register(instance)
    } catch (err) {
      pinoLogger.error({ file, err }, 'Failed to load parser')
    }
  }

  return registry
}
