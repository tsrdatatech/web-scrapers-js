/**
 * @fileoverview Tests for parser registry functionality
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import { createParserRegistry } from '../src/core/parser-registry.js'
import { BaseParser } from '../src/core/base-parser.js'

describe('ParserRegistry', () => {
  let registry

  beforeEach(async () => {
    registry = await createParserRegistry()
  })

  describe('Parser Discovery', () => {
    test('should auto-discover and load parsers', async () => {
      const parsers = registry.all()
      expect(parsers).toHaveLength(2)

      const parserIds = parsers.map(p => p.id)
      expect(parserIds).toContain('generic-news')
      expect(parserIds).toContain('weibo')
    })

    test('should load parsers that extend BaseParser', async () => {
      const parsers = registry.all()
      parsers.forEach(parser => {
        expect(parser).toBeInstanceOf(BaseParser)
        expect(parser.id).toBeTruthy()
        expect(typeof parser.canParse).toBe('function')
        expect(typeof parser.parse).toBe('function')
      })
    })
  })

  describe('Parser Retrieval', () => {
    test('should retrieve parser by ID', async () => {
      const newsParser = registry.get('generic-news')
      expect(newsParser).toBeTruthy()
      expect(newsParser.id).toBe('generic-news')
    })

    test('should return undefined for non-existent parser', async () => {
      const parser = registry.get('non-existent')
      expect(parser).toBeUndefined()
    })

    test('should retrieve all parsers', async () => {
      const parsers = registry.all()
      expect(Array.isArray(parsers)).toBe(true)
      expect(parsers.length).toBeGreaterThan(0)
    })
  })

  describe('Parser Validation', () => {
    test('generic-news parser should have correct schema', async () => {
      const parser = registry.get('generic-news')
      expect(parser.schema).toBeTruthy()
      expect(parser.domains).toEqual([])
    })

    test('weibo parser should have correct domains', async () => {
      const parser = registry.get('weibo')
      expect(parser.domains).toContain('weibo.com')
    })
  })
})
