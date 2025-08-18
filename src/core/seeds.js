import fs from 'fs/promises'

function parseLine(line) {
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
    return { url: line }
  }
  return null
}

export async function resolveSeeds(args) {
  if (args.url) {
    return [{ url: args.url, label: args.label, parser: args.parser }]
  }
  if (args.file) {
    const txt = await fs.readFile(args.file, 'utf8')
    return txt
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(parseLine)
      .filter(Boolean)
  }
  throw new Error('Provide --url or --file')
}
