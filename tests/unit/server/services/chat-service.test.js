import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'

import { sendQuestion, getConversation } from '../../../../src/server/services/chat-service.js'
import { config } from '../../../../src/config/config.js'

describe('chat-api', () => {
  const chatApiUrl = config.get('chatApiUrl')

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('sendQuestion', () => {
    test('should send question and return conversation details', async () => {
      nock(chatApiUrl)
        .post('/chat', {
          question: 'What is UCD?',
          conversation_id: null,
          model_id: 'sonnet-3.7'
        })
        .reply(200, {
          conversation_id: 'conv-123',
          message_id: 'msg-456',
          status: 'queued'
        })

      const result = await sendQuestion('What is UCD?', 'sonnet-3.7', null)

      expect(result).toEqual({
        conversationId: 'conv-123',
        messageId: 'msg-456',
        status: 'queued'
      })
    })

    test('should send question with existing conversationId', async () => {
      nock(chatApiUrl)
        .post('/chat', {
          question: 'Tell me more',
          conversation_id: 'existing-conv-123',
          model_id: 'haiku'
        })
        .reply(200, {
          conversation_id: 'existing-conv-123',
          message_id: 'msg-789',
          status: 'queued'
        })

      const result = await sendQuestion('Tell me more', 'haiku', 'existing-conv-123')

      expect(result).toEqual({
        conversationId: 'existing-conv-123',
        messageId: 'msg-789',
        status: 'queued'
      })
    })

    test('should handle camelCase response format', async () => {
      nock(chatApiUrl)
        .post('/chat')
        .reply(200, {
          conversationId: 'conv-456',
          messageId: 'msg-789'
        })

      const result = await sendQuestion('Test question', 'sonnet-3.7', null)

      expect(result.conversationId).toBe('conv-456')
      expect(result.messageId).toBe('msg-789')
    })

    test('should throw error when API returns 400', async () => {
      nock(chatApiUrl)
        .post('/chat')
        .reply(400, {
          error: 'Bad request'
        })

      await expect(sendQuestion('Test', 'model-1', null))
        .rejects
        .toThrow('Chat API returned 400')
    })

    test('should throw error when API returns 500', async () => {
      nock(chatApiUrl)
        .post('/chat')
        .reply(500, {
          error: 'Internal server error'
        })

      await expect(sendQuestion('Test', 'model-1', null))
        .rejects
        .toThrow('Chat API returned 500')
    })

    test('should throw error with response details when API fails', async () => {
      nock(chatApiUrl)
        .post('/chat')
        .reply(503, {
          error: 'Service unavailable'
        })

      try {
        await sendQuestion('Test', 'model-1', null)
      } catch (error) {
        expect(error.message).toBe('Chat API returned 503')
        expect(error.response.status).toBe(503)
        expect(error.response.data).toEqual({ error: 'Service unavailable' })
      }
    })

    test('should throw connection error when network fails', async () => {
      nock(chatApiUrl)
        .post('/chat')
        .replyWithError('Network error')

      await expect(sendQuestion('Test', 'model-1', null))
        .rejects
        .toThrow(/Failed to connect to chat API/)
    })
  })

  describe('getConversation', () => {
    test('should retrieve conversation and parse markdown', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-123')
        .reply(200, {
          conversation_id: 'conv-123',
          messages: [
            {
              role: 'user',
              content: 'What is **UCD**?'
            },
            {
              role: 'assistant',
              content: '# User-Centered Design\n\nIt is a design approach.'
            }
          ]
        })

      const result = await getConversation('conv-123')

      expect(result.conversationId).toBe('conv-123')
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].content).toContain('<strong>UCD</strong>')
      expect(result.messages[1].content).toContain('<h1')
      expect(result.messages[1].content).toContain('User-Centered Design')
    })

    test('should handle empty message content', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-456')
        .reply(200, {
          conversation_id: 'conv-456',
          messages: [
            {
              role: 'user',
              content: null
            },
            {
              role: 'assistant',
              content: ''
            }
          ]
        })

      const result = await getConversation('conv-456')

      expect(result.messages[0].content).toBe('')
      expect(result.messages[1].content).toBe('')
    })

    test('should handle empty messages array', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-789')
        .reply(200, {
          conversation_id: 'conv-789',
          messages: []
        })

      const result = await getConversation('conv-789')

      expect(result.conversationId).toBe('conv-789')
      expect(result.messages).toEqual([])
    })

    test('should handle missing messages field', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-999')
        .reply(200, {
          conversation_id: 'conv-999'
        })

      const result = await getConversation('conv-999')

      expect(result.conversationId).toBe('conv-999')
      expect(result.messages).toEqual([])
    })

    test('should handle camelCase conversationId in response', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-111')
        .reply(200, {
          conversationId: 'conv-111',
          messages: []
        })

      const result = await getConversation('conv-111')

      expect(result.conversationId).toBe('conv-111')
    })

    test('should throw error when API returns 404', async () => {
      nock(chatApiUrl)
        .get('/conversations/not-found')
        .reply(404, 'Not found')

      try {
        await getConversation('not-found')
      } catch (error) {
        expect(error.message).toBe('Chat API returned 404')
        expect(error.response.status).toBe(404)
        expect(error.response.data).toBe('Not found')
      }
    })

    test('should throw error when API returns 500', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-error')
        .reply(500, 'Internal server error')

      try {
        await getConversation('conv-error')
      } catch (error) {
        expect(error.message).toBe('Chat API returned 500')
        expect(error.response.status).toBe(500)
      }
    })

    test('should timeout after specified duration', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-slow')
        .delay(3000)
        .reply(200, {
          conversation_id: 'conv-slow',
          messages: []
        })

      await expect(getConversation('conv-slow', 100))
        .rejects
        .toThrow()
    }, 5000)

    test('should use default timeout of 2000ms', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-default')
        .delay(2500)
        .reply(200, {
          conversation_id: 'conv-default',
          messages: []
        })

      await expect(getConversation('conv-default'))
        .rejects
        .toThrow()
    }, 5000)

    test('should preserve message metadata when parsing', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-metadata')
        .reply(200, {
          conversation_id: 'conv-metadata',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              timestamp: '2026-02-10T12:00:00Z',
              message_id: 'msg-1'
            }
          ]
        })

      const result = await getConversation('conv-metadata')

      expect(result.messages[0].role).toBe('user')
      expect(result.messages[0].timestamp).toBe('2026-02-10T12:00:00Z')
      expect(result.messages[0].message_id).toBe('msg-1')
    })
  })
})
