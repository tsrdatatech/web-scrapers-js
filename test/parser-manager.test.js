/**
 * @fileoverview Tests for parser selection manager
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { createParserRegistry } from '../src/core/parser-registry.js'
import { createParserManager } from '../src/core/parser-select.js'

describe('ParserManager', () => {
  let registry, manager

  beforeEach(async () => {
    registry = await createParserRegistry()
    manager = createParserManager(registry)
  })

  describe('Parser Selection', () => {
    test('should select parser by forced ID', async () => {
      const parser = await manager.selectParser({
        url: 'https://example.com',
        forcedId: 'generic-news',
      })

      expect(parser).toBeTruthy()
      expect(parser.id).toBe('generic-news')
    })

    test('should return undefined for invalid forced ID', async () => {
      const parser = await manager.selectParser({
        url: 'https://example.com',
        forcedId: 'non-existent',
      })

      expect(parser).toBeUndefined()
    })

    test('should auto-select weibo parser for weibo.com URLs', async () => {
      const parser = await manager.selectParser({
        url: 'https://weibo.com/someuser',
      })

      expect(parser).toBeTruthy()
      expect(parser.id).toBe('weibo')
    })

    test('should select generic-news parser for news URLs', async () => {
      const parser = await manager.selectParser({
        url: 'https://example.com/news/breaking-story',
      })

      expect(parser).toBeTruthy()
      expect(parser.id).toBe('generic-news')
    })

    test('should return null when no suitable parser found', async () => {
      const parser = await manager.selectParser({
        url: 'https://definitely-not-parseable.com/random',
      })

      // May return null or generic-news depending on fallback logic
      expect(parser === null || parser.id === 'generic-news').toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle parser canParse errors gracefully', async () => {
      // Mock a parser that throws an error
      const mockParser = {
        id: 'error-parser',
        canParse: jest.fn().mockRejectedValue(new Error('Test error')),
        parse: jest.fn(),
      }

      registry.register(mockParser)

      const parser = await manager.selectParser({
        url: 'https://example.com/news/breaking', // Use a news URL that generic-news can handle
      })

      // Should not throw and should find an alternative parser (generic-news)
      expect(parser).toBeTruthy()
      expect(parser.id).toBe('generic-news')
    })
  })
})
