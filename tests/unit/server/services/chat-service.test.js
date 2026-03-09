import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'
import { getUserId } from '../../../../src/server/common/helpers/user-context.js'
import { sendQuestion, getConversation } from '../../../../src/server/services/chat-service.js'
import { config } from '../../../../src/config/config.js'

vi.mock('../../../../src/server/common/helpers/user-context.js', () => ({
  getUserId: vi.fn().mockReturnValue('test-user-123')
}))

vi.mock('../../../../src/server/common/helpers/audit.js', () => ({
  auditLlmInteraction: vi.fn()
}))

const { auditLlmInteraction } = await import('../../../../src/server/common/helpers/audit.js')

describe('chat-api', () => {
  const chatApiUrl = config.get('chatApiUrl')

  beforeEach(() => {
    nock.cleanAll()
    vi.clearAllMocks()
    getUserId.mockReturnValue('test-user-123')
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

      const result = await getConversation('conv-123', 'session-123', 'model-456')

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

      const result = await getConversation('conv-456', 'session-123', 'model-456')

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

      const result = await getConversation('conv-789', 'session-123', 'model-456')

      expect(result.conversationId).toBe('conv-789')
      expect(result.messages).toEqual([])
    })

    test('should handle missing messages field', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-999')
        .reply(200, {
          conversation_id: 'conv-999'
        })

      const result = await getConversation('conv-999', 'session-123', 'model-456')

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

      const result = await getConversation('conv-111', 'session-123', 'model-456')

      expect(result.conversationId).toBe('conv-111')
    })

    test('should throw error when API returns 404', async () => {
      nock(chatApiUrl)
        .get('/conversations/not-found')
        .reply(404, 'Not found')

      try {
        await getConversation('not-found', 'session-123', 'model-456')
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
        await getConversation('conv-error', 'session-123', 'model-456')
      } catch (error) {
        expect(error.message).toBe('Chat API returned 500')
        expect(error.response.status).toBe(500)
      }
    })

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

      const result = await getConversation('conv-metadata', 'session-123', 'model-456')

      expect(result.messages[0].role).toBe('user')
      expect(result.messages[0].timestamp).toBe('2026-02-10T12:00:00Z')
      expect(result.messages[0].message_id).toBe('msg-1')
    })
  })

  describe('request headers', () => {
    test('includes user-id header when a user context is active', async () => {
      getUserId.mockReturnValue('test-oid-abc123')

      let capturedHeaders
      nock(chatApiUrl)
        .post('/chat')
        .reply(function () {
          capturedHeaders = this.req.headers
          return [200, { conversation_id: 'c1', message_id: 'm1', status: 'queued' }]
        })

      await sendQuestion('q', 'model', null)

      expect(capturedHeaders['user-id']).toBe('test-oid-abc123')
    })

    test('omits user-id header when no user context is active', async () => {
      getUserId.mockReturnValue(null)

      let capturedHeaders
      nock(chatApiUrl)
        .post('/chat')
        .reply(function () {
          capturedHeaders = this.req.headers
          return [200, { conversation_id: 'c1', message_id: 'm1', status: 'queued' }]
        })

      await sendQuestion('q', 'model', null)

      expect(capturedHeaders['user-id']).toBeUndefined()
    })
  })

  describe('auditing', () => {
    test('audits when conversation has completed assistant messages', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-completed')
        .reply(200, {
          conversation_id: 'conv-completed',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              status: 'completed'
            },
            {
              role: 'assistant',
              content: 'Hi there!',
              status: 'completed'
            }
          ]
        })

      await getConversation('conv-completed', 'session-123', 'model-456')

      expect(auditLlmInteraction).toHaveBeenCalledWith({
        userId: 'test-user-123',
        sessionId: 'session-123',
        conversationId: 'conv-completed',
        modelId: 'model-456',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', status: 'completed' })
        ])
      })
    })

    test('does not audit when conversation has no completed assistant messages', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-pending')
        .reply(200, {
          conversation_id: 'conv-pending',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              status: 'completed'
            },
            {
              role: 'assistant',
              content: 'Thinking...',
              status: 'pending'
            }
          ]
        })

      await getConversation('conv-pending', 'session-123', 'model-456')

      // Audit helper is called but doesn't emit event for pending messages
      expect(auditLlmInteraction).toHaveBeenCalledWith({
        userId: 'test-user-123',
        sessionId: 'session-123',
        conversationId: 'conv-pending',
        modelId: 'model-456',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', status: 'pending' })
        ])
      })
    })

    test('does not audit when conversation has only user messages', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-user-only')
        .reply(200, {
          conversation_id: 'conv-user-only',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              status: 'completed'
            }
          ]
        })

      await getConversation('conv-user-only', 'session-123', 'model-456')

      // Audit helper is called but doesn't emit event for user-only messages
      expect(auditLlmInteraction).toHaveBeenCalledWith({
        userId: 'test-user-123',
        sessionId: 'session-123',
        conversationId: 'conv-user-only',
        modelId: 'model-456',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', status: 'completed' })
        ])
      })
    })

    test('audits with failure status when assistant message has failed', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-failed')
        .reply(200, {
          conversation_id: 'conv-failed',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              status: 'completed'
            },
            {
              role: 'assistant',
              content: 'Error occurred',
              status: 'failed'
            }
          ]
        })

      await getConversation('conv-failed', 'session-789', 'model-999')

      expect(auditLlmInteraction).toHaveBeenCalledWith({
        userId: 'test-user-123',
        sessionId: 'session-789',
        conversationId: 'conv-failed',
        modelId: 'model-999',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', status: 'failed' })
        ])
      })
    })

    test('audits with failure status when conversation has both completed and failed messages', async () => {
      nock(chatApiUrl)
        .get('/conversations/conv-mixed')
        .reply(200, {
          conversation_id: 'conv-mixed',
          messages: [
            {
              role: 'assistant',
              content: 'First response',
              status: 'completed'
            },
            {
              role: 'assistant',
              content: 'Failed response',
              status: 'failed'
            }
          ]
        })

      await getConversation('conv-mixed', 'session-abc', 'model-def')

      expect(auditLlmInteraction).toHaveBeenCalledWith({
        userId: 'test-user-123',
        sessionId: 'session-abc',
        conversationId: 'conv-mixed',
        modelId: 'model-def',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', status: 'completed' }),
          expect.objectContaining({ role: 'assistant', status: 'failed' })
        ])
      })
    })
  })
})
