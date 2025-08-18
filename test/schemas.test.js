/**
 * @fileoverview Tests for schema validation
 */

import { describe, test, expect } from '@jest/globals'
import { NewsArticleSchema } from '../src/schemas/news.js'

describe('NewsArticleSchema', () => {
  describe('Valid Data', () => {
    test('should validate complete news article', () => {
      const validArticle = {
        id: 'article_123',
        title: 'Breaking News: Important Event',
        author: 'Jane Doe',
        publishedAt: new Date('2024-01-15T10:30:00Z'),
        url: 'https://example.com/news/article',
        description: 'Brief description of the article',
        content: 'Full article content goes here...',
        image: 'https://example.com/image.jpg',
        source: 'example.com',
      }

      const result = NewsArticleSchema.parse(validArticle)
      expect(result).toEqual(validArticle)
    })

    test('should validate minimal news article', () => {
      const minimalArticle = {
        title: 'Minimal Article',
        url: 'https://example.com/minimal',
      }

      const result = NewsArticleSchema.parse(minimalArticle)
      expect(result.title).toBe('Minimal Article')
      expect(result.url).toBe('https://example.com/minimal')
    })

    test('should coerce date strings to Date objects', () => {
      const articleWithStringDate = {
        title: 'Article with String Date',
        url: 'https://example.com/article',
        publishedAt: '2024-01-15T10:30:00Z',
      }

      const result = NewsArticleSchema.parse(articleWithStringDate)
      expect(result.publishedAt).toBeInstanceOf(Date)
      expect(result.publishedAt.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })
  })

  describe('Invalid Data', () => {
    test('should reject article without title', () => {
      const invalidArticle = {
        url: 'https://example.com/article',
        // missing title
      }

      expect(() => NewsArticleSchema.parse(invalidArticle)).toThrow()
    })

    test('should reject article without URL', () => {
      const invalidArticle = {
        title: 'Article Title',
        // missing url
      }

      expect(() => NewsArticleSchema.parse(invalidArticle)).toThrow()
    })

    test('should reject invalid URL format', () => {
      const invalidArticle = {
        title: 'Article Title',
        url: 'not-a-valid-url',
      }

      expect(() => NewsArticleSchema.parse(invalidArticle)).toThrow()
    })

    test('should reject invalid image URL format', () => {
      const invalidArticle = {
        title: 'Article Title',
        url: 'https://example.com/article',
        image: 'not-a-valid-image-url',
      }

      expect(() => NewsArticleSchema.parse(invalidArticle)).toThrow()
    })

    test('should reject invalid data types', () => {
      const invalidArticle = {
        title: 123, // should be string
        url: 'https://example.com/article',
      }

      expect(() => NewsArticleSchema.parse(invalidArticle)).toThrow()
    })
  })

  describe('Optional Fields', () => {
    test('should handle undefined optional fields', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        author: undefined,
        publishedAt: undefined,
        description: undefined,
        content: undefined,
        image: undefined,
        source: undefined,
      }

      const result = NewsArticleSchema.parse(article)
      expect(result.title).toBe('Test Article')
      expect(result.author).toBeUndefined()
      expect(result.publishedAt).toBeUndefined()
    })

    test('should preserve optional fields when provided', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        author: 'Test Author',
        description: 'Test description',
        source: 'test.com',
      }

      const result = NewsArticleSchema.parse(article)
      expect(result.author).toBe('Test Author')
      expect(result.description).toBe('Test description')
      expect(result.source).toBe('test.com')
    })
  })
})
