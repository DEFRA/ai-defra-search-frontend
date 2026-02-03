import { vi, describe, it, expect, beforeEach } from 'vitest'

import { startGetController, startPostController } from '../controller.js'
import { sendQuestion, getConversation as getConversationApi } from '../chat-api.js'
import { getModels } from '../models-api.js'
import { getConversation as getCachedConversation, storeConversation } from '../conversation-cache.js'

// Mock external modules
vi.mock('../chat-api.js', () => ({
  sendQuestion: vi.fn(),
  getConversation: vi.fn()
}))

vi.mock('../models-api.js', () => ({
  getModels: vi.fn()
}))

vi.mock('../conversation-cache.js', () => ({
  getConversation: vi.fn(),
  storeConversation: vi.fn(),
  clearConversation: vi.fn()
}))

describe('start controller', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('startPostController', () => {
    it('redirects to conversation page after successful POST with 303', async () => {
      sendQuestion.mockResolvedValue({ conversationId: 'abc-123', messageId: 'msg-1' })
      getCachedConversation.mockResolvedValue(null)

      const request = {
        payload: { modelId: 'm1', question: 'hello' },
        params: {}
      }

      const h = {
        redirect: vi.fn().mockReturnValue({
          code: vi.fn().mockReturnValue({ redirected: true })
        })
      }

      await startPostController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith('/start/abc-123')
      expect(sendQuestion).toHaveBeenCalledWith('hello', 'm1', undefined)
      expect(storeConversation).toHaveBeenCalled()
    })

    it('stores user question and placeholder message in cache with initialViewPending flag', async () => {
      sendQuestion.mockResolvedValue({ conversationId: 'abc-123', messageId: 'msg-1' })
      getCachedConversation.mockResolvedValue(null)

      const request = {
        payload: { modelId: 'm1', question: 'hello' },
        params: {}
      }

      const h = {
        redirect: vi.fn().mockReturnValue({
          code: vi.fn().mockReturnValue({ redirected: true })
        })
      }

      await startPostController.handler(request, h)

      expect(storeConversation).toHaveBeenCalledWith(
        'abc-123',
        expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'assistant' })
        ]),
        'm1',
        { initialViewPending: true }
      )
    })

    it('appends to existing conversation history', async () => {
      const existingMessages = [
        { role: 'user', content: '<p>first question</p>' },
        { role: 'assistant', content: '<p>first answer</p>' }
      ]

      sendQuestion.mockResolvedValue({ conversationId: 'abc-123', messageId: 'msg-2' })
      getCachedConversation.mockResolvedValue({ messages: existingMessages })

      const request = {
        payload: { modelId: 'm1', question: 'second question' },
        params: {}
      }

      const h = {
        redirect: vi.fn().mockReturnValue({
          code: vi.fn().mockReturnValue({ redirected: true })
        })
      }

      await startPostController.handler(request, h)

      const storedMessages = storeConversation.mock.calls[0][1]
      expect(storedMessages).toHaveLength(4)
      expect(storedMessages[0]).toEqual(existingMessages[0])
      expect(storedMessages[1]).toEqual(existingMessages[1])
    })
  })

  describe('startGetController', () => {
    it('returns empty start page when no conversationId', async () => {
      getModels.mockResolvedValue([{ id: 'm1', name: 'Model 1' }])

      const request = { params: {} }
      const h = { view: vi.fn().mockReturnValue({ path: 'start/start' }) }

      await startGetController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'start/start',
        expect.objectContaining({
          models: expect.any(Array)
        })
      )
      expect(getCachedConversation).not.toHaveBeenCalled()
    })

    it('returns cached messages when initialViewPending is true', async () => {
      const cachedMessages = [
        { role: 'user', content: '<p>hello</p>' },
        { role: 'assistant', content: '<p>AI agent is responding, refresh to see latest response</p>' }
      ]

      getCachedConversation.mockResolvedValue({
        conversationId: 'c-1',
        messages: cachedMessages,
        modelId: 'm1',
        initialViewPending: true
      })
      getModels.mockResolvedValue([{ id: 'm1', name: 'Model 1' }])

      const request = { params: { conversationId: 'c-1' } }
      const h = { view: vi.fn().mockReturnValue({ path: 'start/start' }) }

      await startGetController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'start/start',
        expect.objectContaining({
          messages: cachedMessages,
          conversationId: 'c-1'
        })
      )
      expect(storeConversation).toHaveBeenCalledWith(
        'c-1',
        cachedMessages,
        'm1',
        { initialViewPending: false }
      )
    })

    it('fetches from API when initialViewPending is false', async () => {
      getCachedConversation.mockResolvedValue({
        conversationId: 'c-1',
        messages: [{ role: 'user', content: '<p>hello</p>' }],
        initialViewPending: false
      })

      getConversationApi.mockResolvedValue({
        conversationId: 'c-1',
        messages: [
          { role: 'user', content: '<p>hello</p>' },
          { role: 'assistant', content: '<p>real response</p>' }
        ]
      })
      getModels.mockResolvedValue([{ id: 'm1', name: 'Model 1' }])

      const request = { params: { conversationId: 'c-1' } }
      const h = { view: vi.fn().mockReturnValue({ path: 'start/start' }) }

      await startGetController.handler(request, h)

      expect(getConversationApi).toHaveBeenCalledWith('c-1')
      expect(h.view).toHaveBeenCalledWith(
        'start/start',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'assistant', content: '<p>real response</p>' })
          ])
        })
      )
    })

    it('renders conversation view with notFound on 404', async () => {
      getCachedConversation.mockResolvedValue(null)

      const notFoundError = new Error('not found')
      notFoundError.response = { status: 404 }
      getConversationApi.mockRejectedValue(notFoundError)
      getModels.mockResolvedValue([])

      const request = { params: { conversationId: 'does-not-exist' } }
      const h = {
        view: vi.fn().mockReturnValue({
          code: vi.fn().mockReturnValue({ path: 'start/start' })
        })
      }

      await startGetController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'start/start',
        expect.objectContaining({
          notFound: true,
          conversationId: 'does-not-exist'
        })
      )
    })

    it('returns empty messages on timeout', async () => {
      getCachedConversation.mockResolvedValue(null)
      getConversationApi.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 2000)))
      getModels.mockResolvedValue([])

      const request = { params: { conversationId: 'c-1' } }
      const h = { view: vi.fn().mockReturnValue({ path: 'start/start' }) }

      await startGetController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'start/start',
        expect.objectContaining({
          messages: [],
          conversationId: 'c-1'
        })
      )
    })
  })
})
