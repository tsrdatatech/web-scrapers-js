export class BaseParser {
  id = 'base'
  schema = null // zod schema
  domains = [] // optional list of domains it handles

  async canParse(_url, _ctx) {
    return false
  }

  // Must return validated data or null
  async parse(_page, _ctx) {
    throw new Error('parse() not implemented')
  }
}
