/**
 * @fileoverview Tests for individual parsers
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import GenericNewsParser from '../src/parsers/genericNewsParser.js'
import WeiboParser from '../src/parsers/weiboParser.js'

// Mock the article extractor to prevent real HTTP requests
jest.mock('@extractus/article-extractor', () => ({
  extract: jest
    .fn()
    .mockRejectedValue(new Error('Request failed with error code 404')),
}))

// Mock playwright page object
const createMockPage = (overrides = {}) => ({
  waitForLoadState: jest.fn().mockResolvedValue(),
  title: jest.fn().mockResolvedValue('Test Article Title'),
  textContent: jest.fn().mockResolvedValue('Test content'),
  ...overrides,
})

describe('GenericNewsParser', () => {
  let parser

  beforeEach(() => {
    parser = new GenericNewsParser()
  })

  describe('Parser Configuration', () => {
    test('should have correct ID and schema', () => {
      expect(parser.id).toBe('generic-news')
      expect(parser.schema).toBeTruthy()
      expect(parser.domains).toEqual([])
    })
  })

  describe('URL Parsing Detection', () => {
    test('should detect news URLs', async () => {
      const testUrls = [
        'https://example.com/news/story',
        'https://example.com/article/123',
        'https://example.com/story/breaking',
        'https://example.com/post/update',
        'https://blog.example.com/2024/01/article',
      ]

      for (const url of testUrls) {
        const canParse = await parser.canParse(url)
        expect(canParse).toBe(true)
      }
    })

    test('should reject non-news URLs', async () => {
      const testUrls = [
        'https://example.com',
        'https://example.com/about',
        'https://example.com/contact',
        'https://example.com/products/item',
      ]

      for (const url of testUrls) {
        const canParse = await parser.canParse(url)
        expect(canParse).toBe(false)
      }
    })
  })

  describe('Content Parsing', () => {
    test('should parse basic article content', async () => {
      const mockPage = createMockPage({
        title: jest.fn().mockResolvedValue('Breaking News: Important Story'),
        textContent: jest.fn().mockResolvedValue('This is the article content'),
      })

      const context = {
        request: {
          url: 'https://example.com/news/story',
          loadedUrl: 'https://example.com/news/story',
        },
        page: mockPage,
      }

      const result = await parser.parse(mockPage, context)

      expect(result).toBeTruthy()
      expect(result.title).toBe('Breaking News: Important Story')
      expect(result.url).toBe('https://example.com/news/story')
      expect(result.source).toBe('example.com')
    }, 10000)

    test('should handle parsing errors gracefully', async () => {
      const waitForLoadStateMock = jest
        .fn()
        .mockRejectedValue(new Error('Load failed'))
      const mockPage = createMockPage({
        waitForLoadState: waitForLoadStateMock,
      })

      const context = {
        request: { url: 'https://example.com/news/story' },
        page: mockPage,
      }

      await expect(parser.parse(mockPage, context)).rejects.toThrow(
        'Load failed'
      )
    })
  })
})

describe('WeiboParser', () => {
  let parser

  beforeEach(() => {
    parser = new WeiboParser()
  })

  describe('Parser Configuration', () => {
    test('should have correct ID, schema, and domains', () => {
      expect(parser.id).toBe('weibo')
      expect(parser.schema).toBeTruthy()
      expect(parser.domains).toContain('weibo.com')
    })
  })

  describe('URL Detection', () => {
    test('should detect weibo URLs', async () => {
      const testUrls = [
        'https://weibo.com/user/123',
        'https://m.weibo.com/status/456',
        'https://www.weibo.com/detail/789',
      ]

      for (const url of testUrls) {
        const canParse = await parser.canParse(url)
        expect(canParse).toBe(true)
      }
    })

    test('should reject non-weibo URLs', async () => {
      const testUrls = [
        'https://twitter.com/user',
        'https://facebook.com/page',
        'https://example.com/weibo',
      ]

      for (const url of testUrls) {
        const canParse = await parser.canParse(url)
        expect(canParse).toBe(false)
      }
    })
  })

  describe('Content Parsing', () => {
    test('should parse weibo post content', async () => {
      const mockPage = createMockPage({
        textContent: jest
          .fn()
          .mockResolvedValueOnce('This is a weibo post content') // main content
          .mockResolvedValueOnce('100') // likes
          .mockResolvedValueOnce('50') // reposts
          .mockResolvedValueOnce('25') // comments
          .mockResolvedValueOnce('TestUser'), // author
      })

      const context = {
        request: {
          id: 'test-post',
          url: 'https://weibo.com/status/123',
          loadedUrl: 'https://weibo.com/status/123',
        },
        page: mockPage,
      }

      const result = await parser.parse(mockPage, context)

      expect(result).toBeTruthy()
      expect(result.content).toContain('weibo post')
      expect(result.url).toBe('https://weibo.com/status/123')
    })
  })
})
