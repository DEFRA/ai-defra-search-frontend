import { describe, test, expect, beforeEach, vi } from 'vitest'
import statusCodes from 'http-status-codes'

// Mock all dependencies before importing controller
vi.mock('../../../../src/server/start/chat-api.js')
vi.mock('../../../../src/server/start/models-api.js')
vi.mock('../../../../src/server/start/conversation-cache.js')
vi.mock('../../../../src/server/start/chat-view-models.js')
vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

const chatApi = await import('../../../../src/server/start/chat-api.js')
const modelsApi = await import('../../../../src/server/start/models-api.js')
const conversationCache = await import('../../../../src/server/start/conversation-cache.js')
const chatViewModels = await import('../../../../src/server/start/chat-view-models.js')
const { startGetController, startPostController } = await import('../../../../src/server/start/controller.js')

describe('Controller error path coverage', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest = {
      params: {},
      payload: {}
    }
    mockH = {
      view: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis()
    }
  })

  test('should handle cache error when clearing initialViewPending flag', async () => {
    const mockModels = [{ id: 'model-1' }]
    const mockCached = {
      conversationId: 'conv-123',
      messages: [{ role: 'user', content: 'test' }],
      modelId: 'model-1',
      initialViewPending: true
    }

    mockRequest.params.conversationId = 'conv-123'
    vi.mocked(modelsApi.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue(mockCached)
    vi.mocked(conversationCache.storeConversation).mockRejectedValue(new Error('Cache error'))

    await startGetController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('start/start', {
      messages: mockCached.messages,
      conversationId: mockCached.conversationId,
      models: mockModels,
      modelId: 'model-1'
    })
    expect(conversationCache.storeConversation).toHaveBeenCalled()
  })

  test('should handle null conversation from API', async () => {
    const mockModels = [{ id: 'model-1' }]

    mockRequest.params.conversationId = 'conv-456'
    vi.mocked(modelsApi.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    vi.mocked(chatApi.getConversation).mockResolvedValue(null)

    await startGetController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('start/start', {
      conversationId: 'conv-456',
      messages: [],
      models: mockModels,
      modelId: null
    })
  })

  test('should handle cache error when storing API conversation', async () => {
    const mockModels = [{ id: 'model-1' }]
    const mockConversation = {
      conversationId: 'conv-789',
      messages: [{ role: 'user', content: 'test' }]
    }

    mockRequest.params.conversationId = 'conv-789'
    vi.mocked(modelsApi.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    vi.mocked(chatApi.getConversation).mockResolvedValue(mockConversation)
    vi.mocked(conversationCache.storeConversation).mockRejectedValue(new Error('Cache error'))

    await startGetController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('start/start', {
      messages: mockConversation.messages,
      conversationId: mockConversation.conversationId,
      models: mockModels,
      modelId: null
    })
  })

  test('should handle 404 error in outer catch block', async () => {
    const mockModels = [{ id: 'model-1' }]
    const notFoundError = new Error('Not found')
    notFoundError.response = { status: 404 }

    mockRequest.params.conversationId = 'not-found'
    vi.mocked(modelsApi.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockRejectedValue(notFoundError)
    vi.mocked(chatViewModels.buildServerErrorViewModel).mockReturnValue({ error: 'Server error' })

    await startGetController.handler(mockRequest, mockH)

    expect(modelsApi.getModels).toHaveBeenCalledTimes(2)
    expect(mockH.view).toHaveBeenCalledWith('start/start', {
      conversationId: 'not-found',
      messages: [],
      notFound: true,
      models: mockModels,
      modelId: null
    })
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.NOT_FOUND)
  })

  test('should handle cache error when storing conversation in POST', async () => {
    const mockResponse = {
      conversationId: 'conv-abc',
      messageId: 'msg-123'
    }

    mockRequest.payload = {
      modelId: 'model-1',
      question: 'Test question'
    }

    vi.mocked(chatApi.sendQuestion).mockResolvedValue(mockResponse)
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    vi.mocked(conversationCache.storeConversation).mockRejectedValue(new Error('Cache error'))

    await startPostController.handler(mockRequest, mockH)

    expect(mockH.redirect).toHaveBeenCalledWith('/start/conv-abc')
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.SEE_OTHER)
  })
})
