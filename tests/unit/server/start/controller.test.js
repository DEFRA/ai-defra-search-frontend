import { describe, test, expect, beforeEach, vi } from 'vitest'
import statusCodes from 'http-status-codes'

vi.mock('../../../../src/server/start/chat-view-model.js', () => ({
  loadConversationPageData: vi.fn(),
  detectPendingConflict: vi.fn(),
  submitQuestion: vi.fn(),
  loadSubmitError: vi.fn(),
  loadValidationError: vi.fn(),
  resetConversation: vi.fn()
}))

const core = await import('../../../../src/server/start/chat-view-model.js')
const { startGetController, startPostController, clearConversationController } = await import('../../../../src/server/start/controller.js')

const mockModels = [{ id: 'model-1' }]
const mockMessages = [{ role: 'user', content: 'hello' }]

let mockRequest
let mockH

beforeEach(() => {
  vi.clearAllMocks()
  mockRequest = {
    params: {},
    payload: {},
    logger: { info: vi.fn(), error: vi.fn() }
  }
  mockH = {
    view: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    takeover: vi.fn().mockReturnThis()
  }
})

describe('startGetController', () => {
  test('renders the start page with data from loadConversationPageData', async () => {
    vi.mocked(core.loadConversationPageData).mockResolvedValue({
      models: mockModels,
      messages: mockMessages,
      conversationId: 'conv-123',
      modelId: null,
      responsePending: false
    })

    await startGetController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('start/start', expect.objectContaining({
      models: mockModels,
      messages: mockMessages,
      conversationId: 'conv-123'
    }))
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.OK)
  })

  test('returns 404 status when loadConversationPageData returns notFound: true', async () => {
    vi.mocked(core.loadConversationPageData).mockResolvedValue({
      models: mockModels,
      messages: [],
      conversationId: 'conv-123',
      modelId: null,
      responsePending: false,
      notFound: true
    })

    await startGetController.handler(mockRequest, mockH)

    expect(mockH.code).toHaveBeenCalledWith(statusCodes.NOT_FOUND)
  })

  test('renders server error page with 500 when loadConversationPageData throws', async () => {
    vi.mocked(core.loadConversationPageData).mockRejectedValue(new Error('Unexpected'))

    await startGetController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith('error/index', expect.anything())
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.INTERNAL_SERVER_ERROR)
  })
})

describe('startPostController', () => {
  describe('failAction', () => {
    test('renders start page with 400 using data from loadValidationError', async () => {
      mockRequest.params = { conversationId: 'conv-123' }
      mockRequest.payload = { question: '', modelId: 'model-1' }
      const joiError = { details: [{ message: '"question" is required' }] }
      vi.mocked(core.loadValidationError).mockResolvedValue({
        models: mockModels,
        messages: mockMessages,
        question: '',
        conversationId: 'conv-123',
        modelId: 'model-1',
        errorMessage: '"question" is required',
        responsePending: false
      })

      await startPostController.options.validate.failAction(mockRequest, mockH, joiError)

      expect(core.loadValidationError).toHaveBeenCalledWith('conv-123', '', 'model-1', '"question" is required')
      expect(mockH.view).toHaveBeenCalledWith('start/start', expect.objectContaining({
        errorMessage: '"question" is required'
      }))
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
      expect(mockH.takeover).toHaveBeenCalled()
    })
  })

  describe('handler', () => {
    test('returns 409 conflict when detectPendingConflict returns conflict data', async () => {
      mockRequest.params = { conversationId: 'conv-pending' }
      mockRequest.payload = { modelId: 'model-1', question: 'q2' }
      vi.mocked(core.detectPendingConflict).mockResolvedValue({
        messages: mockMessages,
        models: mockModels,
        modelId: 'model-1'
      })

      await startPostController.handler(mockRequest, mockH)

      expect(core.submitQuestion).not.toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.CONFLICT)
    })

    test('redirects to the conversation with 303 when submitQuestion succeeds', async () => {
      mockRequest.payload = { modelId: 'model-1', question: 'What is UCD?' }
      vi.mocked(core.detectPendingConflict).mockResolvedValue(null)
      vi.mocked(core.submitQuestion).mockResolvedValue({ conversationId: 'conv-new' })

      await startPostController.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/start/conv-new')
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.SEE_OTHER)
    })

    test('renders start page with data from loadSubmitError when submitQuestion throws', async () => {
      mockRequest.payload = { modelId: 'model-1', question: 'What is UCD?' }
      vi.mocked(core.detectPendingConflict).mockResolvedValue(null)
      vi.mocked(core.submitQuestion).mockRejectedValue(new Error('API down'))
      vi.mocked(core.loadSubmitError).mockResolvedValue({
        models: mockModels,
        messages: [],
        question: 'What is UCD?',
        conversationId: undefined,
        modelId: 'model-1',
        errorDetails: { isRetryable: false, timestamp: new Date() },
        responsePending: false
      })

      await startPostController.handler(mockRequest, mockH)

      expect(core.loadSubmitError).toHaveBeenCalledWith('What is UCD?', 'model-1', undefined, expect.any(Error))
      expect(mockH.view).toHaveBeenCalledWith('start/start', expect.objectContaining({
        question: 'What is UCD?',
        models: mockModels
      }))
    })
  })
})

describe('clearConversationController', () => {
  test('calls resetConversation and redirects to /start', async () => {
    mockRequest.params = { conversationId: 'conv-123' }
    vi.mocked(core.resetConversation).mockResolvedValue(undefined)

    await clearConversationController.handler(mockRequest, mockH)

    expect(core.resetConversation).toHaveBeenCalledWith('conv-123')
    expect(mockH.redirect).toHaveBeenCalledWith('/start')
  })

  test('redirects to /start without calling resetConversation when no conversationId', async () => {
    mockRequest.params = {}

    await clearConversationController.handler(mockRequest, mockH)

    expect(core.resetConversation).not.toHaveBeenCalled()
    expect(mockH.redirect).toHaveBeenCalledWith('/start')
  })
})
