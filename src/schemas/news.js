import { z } from 'zod'

export const NewsArticleSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  author: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  url: z.string().url(),
  description: z.string().optional(),
  content: z.string().optional(),
  image: z.string().url().optional(),
  source: z.string().optional(),
})
