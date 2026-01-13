import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initializeCache, storeConversation, getConversation, getConversationMessages, clearConversation } from '../../../../src/server/start/conversation-cache.js'

describe('conversation-cache', () => {
  let mockCache
  let mockServer

  beforeEach(() => {
    mockCache = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      drop: vi.fn().mockResolvedValue(undefined)
    }

    mockServer = {
      app: {
        cache: mockCache
      }
    }

    initializeCache(mockServer)
  })

  describe('storeConversation', () => {
    it('should store a conversation in the cache with TTL', async () => {
      const conversationId = 'test-conv-123'
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]
      const modelId = 'test-model'

      await storeConversation(conversationId, messages, modelId)

      expect(mockCache.set).toHaveBeenCalledWith(
        'conversation:test-conv-123',
        expect.objectContaining({
          conversationId,
          messages,
          modelId,
          updatedAt: expect.any(String)
        }),
        expect.any(Number) // TTL from config
      )
    })

    it('should not throw an error if cache.set fails', async () => {
      mockCache.set.mockRejectedValue(new Error('Cache error'))

      await expect(
        storeConversation('test-conv', [], 'model')
      ).resolves.not.toThrow()
    })
  })

  describe('getConversation', () => {
    it('should retrieve a conversation from the cache', async () => {
      const cachedData = {
        conversationId: 'test-conv-123',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        modelId: 'test-model',
        updatedAt: '2026-01-09T10:00:00.000Z'
      }

      mockCache.get.mockResolvedValue(cachedData)

      const result = await getConversation('test-conv-123')

      expect(mockCache.get).toHaveBeenCalledWith('conversation:test-conv-123')
      expect(result).toEqual(cachedData)
    })

    it('should return null if conversation is not found', async () => {
      mockCache.get.mockResolvedValue(null)

      const result = await getConversation('non-existent')

      expect(result).toBeNull()
    })

    it('should return null if conversationId is not provided', async () => {
      const result = await getConversation(null)

      expect(result).toBeNull()
      expect(mockCache.get).not.toHaveBeenCalled()
    })

    it('should return null if cache.get throws an error', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'))

      const result = await getConversation('test-conv-123')

      expect(result).toBeNull()
    })
  })

  describe('getConversationMessages', () => {
    it('should retrieve only messages from cached conversation', async () => {
      const cachedData = {
        conversationId: 'test-conv-123',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        modelId: 'test-model',
        updatedAt: '2026-01-09T10:00:00.000Z'
      }

      mockCache.get.mockResolvedValue(cachedData)

      const result = await getConversationMessages('test-conv-123')

      expect(mockCache.get).toHaveBeenCalledWith('conversation:test-conv-123')
      expect(result).toEqual(cachedData.messages)
    })

    it('should return empty array if conversation is not found', async () => {
      mockCache.get.mockResolvedValue(null)

      const result = await getConversationMessages('non-existent')

      expect(result).toEqual([])
    })

    it('should return empty array if conversationId is not provided', async () => {
      const result = await getConversationMessages(null)

      expect(result).toEqual([])
      expect(mockCache.get).not.toHaveBeenCalled()
    })

    it('should return empty array if cache.get throws an error', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'))

      const result = await getConversationMessages('test-conv-123')

      expect(result).toEqual([])
    })
  })

  describe('clearConversation', () => {
    it('should clear a conversation from the cache', async () => {
      const conversationId = 'test-conv-123'

      await clearConversation(conversationId)

      expect(mockCache.drop).toHaveBeenCalledWith('conversation:test-conv-123')
    })

    it('should not call cache.drop if conversationId is not provided', async () => {
      await clearConversation(null)

      expect(mockCache.drop).not.toHaveBeenCalled()
    })

    it('should not throw if cache.drop throws an error', async () => {
      mockCache.drop.mockRejectedValue(new Error('Cache error'))

      await expect(
        clearConversation('test-conv-123')
      ).resolves.toBeUndefined()
    })
  })
})
