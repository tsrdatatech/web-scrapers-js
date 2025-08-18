import { describe, test, expect } from '@jest/globals'
import { resolveSeeds } from '../src/core/seeds.js'

describe('Seeds Resolution', () => {
  describe('URL Parameter', () => {
    test('should resolve single URL with basic args', async () => {
      const args = { url: 'https://example.com' }
      const seeds = await resolveSeeds(args)

      expect(seeds).toHaveLength(1)
      expect(seeds[0]).toEqual({
        url: 'https://example.com',
        label: undefined,
        parser: undefined,
      })
    })

    test('should resolve single URL with label and parser', async () => {
      const args = {
        url: 'https://example.com',
        label: 'a.link',
        parser: 'news',
      }
      const seeds = await resolveSeeds(args)

      expect(seeds).toHaveLength(1)
      expect(seeds[0]).toEqual({
        url: 'https://example.com',
        label: 'a.link',
        parser: 'news',
      })
    })
  })

  describe('Error Cases', () => {
    test('should throw error when neither url nor file provided', async () => {
      const args = {}

      await expect(resolveSeeds(args)).rejects.toThrow(
        'Provide --url or --file'
      )
    })
  })
})
