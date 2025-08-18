import { BaseParser } from '../core/base-parser.js'
import { z } from 'zod'

const WeiboPostSchema = z.object({
  id: z.string(),
  author: z.string().optional(),
  content: z.string(),
  likes: z.number().int().nonnegative().optional(),
  reposts: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  url: z.string().url(),
})

export default class WeiboParser extends BaseParser {
  id = 'weibo'
  schema = WeiboPostSchema
  domains = ['weibo.com']

  async canParse(url) {
    return /weibo\.com/.test(url)
  }

  async parse(page, ctx) {
    const { request } = ctx
    await page.waitForLoadState('domcontentloaded')

    // simplistic example; real Weibo pages are SPA-like and require login for full data
    const content = await page.textContent(
      'article, .Detail_container__content, body'
    )
    const likesText = await safeText(page, 'span:has-text("赞")')
    const repostsText = await safeText(page, 'span:has-text("转发")')
    const commentsText = await safeText(page, 'span:has-text("评论")')

    const toNumber = t => {
      if (!t) return undefined
      const m = t.match(/(\d+[\d.,]*)/)
      return m ? Number(m[1].replace(/[,\.]/g, '')) : undefined
    }

    const data = {
      id: request.id || request.url,
      author: (await safeText(page, 'a:has(img[alt])')) || undefined,
      content: content?.slice(0, 10000) || '',
      likes: toNumber(likesText),
      reposts: toNumber(repostsText),
      comments: toNumber(commentsText),
      url: request.loadedUrl || request.url,
    }
    return this.schema.parse(data)
  }
}

async function safeText(page, selector) {
  try {
    const el = await page.locator(selector).first()
    if ((await el.count()) === 0) return null
    return (await el.textContent())?.trim()
  } catch {
    return null
  }
}
