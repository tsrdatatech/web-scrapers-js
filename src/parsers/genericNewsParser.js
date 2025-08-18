import { BaseParser } from '../core/base-parser.js'
import { NewsArticleSchema } from '../schemas/news.js'
import { extract } from '@extractus/article-extractor'
import { pinoLogger } from '../core/logger.js'

export default class GenericNewsParser extends BaseParser {
  id = 'generic-news'
  schema = NewsArticleSchema

  async canParse(url) {
    return /(news|article|story|post|blog)/i.test(url)
  }

  async parse(page, ctx) {
    const { request } = ctx
    await page.waitForLoadState('domcontentloaded')
    const url = request.loadedUrl || request.url
    let article
    try {
      article = await extract(url)
    } catch (err) {
      pinoLogger.warn({ url, err }, 'Article extraction failed')
    }
    if (!article) {
      // fallback minimal extraction
      const title = await page.title()
      const content = await page.textContent('article, main, body')
      article = { title, content }
    }
    const data = {
      id: request.id,
      title: article.title || (await page.title()),
      author: article.author || undefined,
      publishedAt: article.published || article.published_time || undefined,
      url,
      description: article.description,
      content: article.content,
      image: article.image || article.image_url,
      source: new URL(url).hostname,
    }
    return this.schema.parse(data)
  }
}
