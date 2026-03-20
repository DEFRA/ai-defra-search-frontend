import { describe, test, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../../src/server/services/chat-service.js')
vi.mock('../../../../src/server/services/models-service.js')
vi.mock('../../../../src/server/services/knowledge-groups-service.js')
vi.mock('../../../../src/server/start/conversation-cache.js')
vi.mock('../../../../src/server/start/message-builders.js')
vi.mock('../../../../src/server/start/error-mapping.js')
vi.mock('../../../../src/config/config.js', () => ({
  config: { get: vi.fn().mockReturnValue(500) }
}))
vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() })
}))

const chatService = await import('../../../../src/server/services/chat-service.js')
const modelsService = await import('../../../../src/server/services/models-service.js')
const knowledgeGroupsService = await import('../../../../src/server/services/knowledge-groups-service.js')
const conversationCache = await import('../../../../src/server/start/conversation-cache.js')
const messageBuilders = await import('../../../../src/server/start/message-builders.js')
const errorMapping = await import('../../../../src/server/start/error-mapping.js')

const {
  loadConversationPageData,
  detectPendingConflict,
  submitQuestion,
  loadSubmitError,
  loadValidationError,
  resetConversation
} = await import('../../../../src/server/start/chat-view-model.js')

const mockModels = [{ id: 'model-1', name: 'Model One' }]
const mockKnowledgeGroups = [{ id: 'kg-1', name: 'Test Knowledge Group' }]
const mockKnowledgeGroupSelectItems = [
  { value: '', text: 'No knowledge group' },
  { value: 'kg-1', text: 'Test Knowledge Group' }
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(messageBuilders.hasPendingResponse).mockReturnValue(false)
  vi.mocked(knowledgeGroupsService.listKnowledgeGroups).mockResolvedValue(mockKnowledgeGroups)
})

describe('loadConversationPageData', () => {
  describe('when no conversationId is provided', () => {
    test('returns available models and knowledge groups with empty conversation state', async () => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)

      const result = await loadConversationPageData(undefined)

      expect(result).toMatchObject({ models: mockModels, knowledgeGroupSelectItems: mockKnowledgeGroupSelectItems, messages: [], conversationId: null })
    })

    test('returns empty knowledge groups when the API returns an empty list', async () => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(knowledgeGroupsService.listKnowledgeGroups).mockResolvedValue([])

      const result = await loadConversationPageData(undefined)

      expect(result).toMatchObject({ knowledgeGroupSelectItems: [{ value: '', text: 'No knowledge group' }] })
    })

    test('throws when the knowledge groups API fails', async () => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(knowledgeGroupsService.listKnowledgeGroups).mockRejectedValue(new Error('Knowledge API down'))

      await expect(loadConversationPageData(undefined)).rejects.toThrow('Knowledge API down')
    })
  })

  describe('when cached conversation has initialViewPending set', () => {
    const cached = {
      conversationId: 'conv-123',
      messages: [{ role: 'user', content: 'hello' }],
      modelId: 'model-1',
      initialViewPending: true
    }

    beforeEach(() => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(conversationCache.getConversation).mockResolvedValue(cached)
    })

    test('returns cached messages and clears the flag', async () => {
      vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

      const result = await loadConversationPageData('conv-123')

      expect(conversationCache.storeConversation).toHaveBeenCalledWith(
        'conv-123',
        cached.messages,
        'model-1',
        { initialViewPending: false }
      )
      expect(result).toMatchObject({
        messages: cached.messages,
        conversationId: 'conv-123',
        modelId: 'model-1'
      })
    })

    test('returns cached messages when clearing the flag fails', async () => {
      vi.mocked(conversationCache.storeConversation).mockRejectedValue(new Error('Cache error'))

      const result = await loadConversationPageData('conv-123')

      expect(result).toMatchObject({ messages: cached.messages, conversationId: 'conv-123' })
    })
  })

  describe('when fetching conversation from the API', () => {
    beforeEach(() => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    })

    test('returns messages from the API response', async () => {
      const apiConversation = { conversationId: 'conv-456', messages: [{ role: 'user', content: 'q' }] }
      vi.mocked(chatService.getConversation).mockResolvedValue(apiConversation)
      vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

      const result = await loadConversationPageData('conv-456')

      expect(result).toMatchObject({ messages: apiConversation.messages, conversationId: 'conv-456' })
    })

    test('returns empty state when the API returns null', async () => {
      vi.mocked(chatService.getConversation).mockResolvedValue(null)

      const result = await loadConversationPageData('conv-456')

      expect(result).toMatchObject({ conversationId: 'conv-456', messages: [] })
    })

    test('returns conversation data when updating the cache fails', async () => {
      const apiConversation = { conversationId: 'conv-456', messages: [{ role: 'user', content: 'q' }] }
      vi.mocked(chatService.getConversation).mockResolvedValue(apiConversation)
      vi.mocked(conversationCache.storeConversation).mockRejectedValue(new Error('Cache error'))

      const result = await loadConversationPageData('conv-456')

      expect(result).toMatchObject({ messages: apiConversation.messages })
    })

    test('preserves the cached modelId in both the cache write and returned data', async () => {
      const cachedConversation = { conversationId: 'conv-456', messages: [], modelId: 'non-default-model', initialViewPending: false }
      const apiConversation = { conversationId: 'conv-456', messages: [{ role: 'assistant', content: 'answer' }] }
      vi.mocked(conversationCache.getConversation).mockResolvedValue(cachedConversation)
      vi.mocked(chatService.getConversation).mockResolvedValue(apiConversation)
      vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

      const result = await loadConversationPageData('conv-456')

      expect(conversationCache.storeConversation).toHaveBeenCalledWith(
        'conv-456',
        apiConversation.messages,
        'non-default-model',
        { initialViewPending: false }
      )
      expect(result).toMatchObject({ modelId: 'non-default-model' })
    })
  })

  describe('when the API call times out or is aborted', () => {
    const cached = {
      conversationId: 'conv-timeout',
      messages: [{ role: 'user', content: 'q' }],
      modelId: null,
      initialViewPending: false
    }

    test.each([
      ['timeout message', () => new Error('timeout')],
      ['AbortError name', () => Object.assign(new Error('Aborted'), { name: 'AbortError' })],
      ['type aborted', () => Object.assign(new Error('aborted'), { type: 'aborted' })],
      ['cause.name AbortError', () => new Error('fetch failed', { cause: Object.assign(new Error('Aborted'), { name: 'AbortError' }) })]
    ])('falls back to cached messages on %s', async (_label, makeError) => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(conversationCache.getConversation).mockResolvedValue(cached)
      vi.mocked(chatService.getConversation).mockRejectedValue(makeError())

      const result = await loadConversationPageData('conv-timeout')

      expect(result).toMatchObject({ conversationId: 'conv-timeout', messages: cached.messages })
    })

    test('falls back to empty messages when no cache exists on timeout', async () => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
      vi.mocked(chatService.getConversation).mockRejectedValue(new Error('timeout'))

      const result = await loadConversationPageData('conv-empty')

      expect(result).toMatchObject({ conversationId: 'conv-empty', messages: [] })
    })
  })

  describe('when the API returns 404', () => {
    test('returns not-found state', async () => {
      const notFoundError = Object.assign(new Error('Not found'), { response: { status: 404 } })
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
      vi.mocked(chatService.getConversation).mockRejectedValue(notFoundError)

      const result = await loadConversationPageData('missing-conv')

      expect(result).toMatchObject({ notFound: true, conversationId: 'missing-conv', models: mockModels })
    })
  })

  describe('when an unexpected error occurs', () => {
    test('throws the error', async () => {
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
      vi.mocked(chatService.getConversation).mockRejectedValue(new Error('Unexpected'))

      await expect(loadConversationPageData('conv-error')).rejects.toThrow('Unexpected')
    })
  })
})

describe('detectPendingConflict', () => {
  describe('when no pending response exists', () => {
    test('returns null', async () => {
      vi.mocked(conversationCache.getConversation).mockResolvedValue({
        messages: [{ role: 'user', content: 'q' }],
        modelId: 'model-1'
      })
      vi.mocked(messageBuilders.hasPendingResponse).mockReturnValue(false)

      const result = await detectPendingConflict('conv-123')

      expect(result).toBeNull()
    })
  })

  describe('when a pending response exists', () => {
    test('returns messages, models, and modelId', async () => {
      const cachedMessages = [
        { role: 'user', content: 'q' },
        { role: 'assistant', content: '', isPlaceholder: true }
      ]
      vi.mocked(conversationCache.getConversation).mockResolvedValue({
        messages: cachedMessages,
        modelId: 'model-1'
      })
      vi.mocked(messageBuilders.hasPendingResponse).mockReturnValue(true)
      vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)

      const result = await detectPendingConflict('conv-123')

      expect(result).toMatchObject({ messages: cachedMessages, models: mockModels, knowledgeGroupSelectItems: mockKnowledgeGroupSelectItems, modelId: 'model-1' })
    })
  })
})

describe('submitQuestion', () => {
  describe('when the API responds successfully', () => {
    const apiResponse = { conversationId: 'conv-new', messageId: 'msg-1' }

    beforeEach(() => {
      vi.mocked(chatService.sendQuestion).mockResolvedValue(apiResponse)
      vi.mocked(messageBuilders.buildUserMessage).mockReturnValue({ role: 'user', content: 'What is UCD?' })
      vi.mocked(messageBuilders.buildPlaceholderMessage).mockReturnValue({ role: 'assistant', isPlaceholder: true })
    })

    test('returns the conversation id', async () => {
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
      vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

      const result = await submitQuestion('What is UCD?', 'model-1', null)

      expect(result).toEqual({ conversationId: 'conv-new' })
    })

    test('stages user message and placeholder in cache', async () => {
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
      vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

      await submitQuestion('What is UCD?', 'model-1', null)

      expect(conversationCache.storeConversation).toHaveBeenCalledWith(
        'conv-new',
        expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'assistant', isPlaceholder: true })
        ]),
        'model-1',
        { initialViewPending: true }
      )
    })

    test('merges with existing cached messages', async () => {
      const existing = [{ role: 'user', content: 'previous' }]
      vi.mocked(conversationCache.getConversation).mockResolvedValue({ messages: existing })
      vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

      await submitQuestion('What is UCD?', 'model-1', 'conv-existing')

      expect(conversationCache.storeConversation).toHaveBeenCalledWith(
        'conv-new',
        expect.arrayContaining([
          expect.objectContaining({ content: 'previous' }),
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ isPlaceholder: true })
        ]),
        'model-1',
        { initialViewPending: true }
      )
    })

    test('returns the conversation id when storing the placeholder fails', async () => {
      vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
      vi.mocked(conversationCache.storeConversation).mockRejectedValue(new Error('Cache error'))

      const result = await submitQuestion('What is UCD?', 'model-1', null)

      expect(result).toEqual({ conversationId: 'conv-new' })
    })
  })

  describe('when the API fails', () => {
    test('throws the error', async () => {
      vi.mocked(chatService.sendQuestion).mockRejectedValue(new Error('API down'))

      await expect(submitQuestion('What is UCD?', 'model-1', null)).rejects.toThrow('API down')
    })
  })

  test('passes the knowledge group id to the chat API', async () => {
    const apiResponse = { conversationId: 'conv-new', messageId: 'msg-1' }
    vi.mocked(chatService.sendQuestion).mockResolvedValue(apiResponse)
    vi.mocked(messageBuilders.buildUserMessage).mockReturnValue({ role: 'user', content: 'q' })
    vi.mocked(messageBuilders.buildPlaceholderMessage).mockReturnValue({ role: 'assistant', isPlaceholder: true })
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

    await submitQuestion('What is UCD?', 'model-1', null, 'kg-1')

    expect(chatService.sendQuestion).toHaveBeenCalledWith('What is UCD?', 'model-1', null, 'kg-1')
  })

  test('passes no knowledge group id when none is selected', async () => {
    const apiResponse = { conversationId: 'conv-new', messageId: 'msg-1' }
    vi.mocked(chatService.sendQuestion).mockResolvedValue(apiResponse)
    vi.mocked(messageBuilders.buildUserMessage).mockReturnValue({ role: 'user', content: 'q' })
    vi.mocked(messageBuilders.buildPlaceholderMessage).mockReturnValue({ role: 'assistant', isPlaceholder: true })
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    vi.mocked(conversationCache.storeConversation).mockResolvedValue(undefined)

    await submitQuestion('What is UCD?', 'model-1', null, null)

    expect(chatService.sendQuestion).toHaveBeenCalledWith('What is UCD?', 'model-1', null, null)
  })
})

describe('loadSubmitError', () => {
  test('returns models, cached messages, and mapped error details', async () => {
    const cachedMessages = [{ role: 'user', content: 'q' }]
    const errorDetails = { isRetryable: true, timestamp: new Date() }
    vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue({ messages: cachedMessages })
    vi.mocked(errorMapping.getErrorDetails).mockResolvedValue(errorDetails)
    vi.mocked(messageBuilders.hasPendingResponse).mockReturnValue(false)

    const result = await loadSubmitError('my question', 'model-1', 'conv-123', new Error('fail'))

    expect(result).toMatchObject({
      models: mockModels,
      messages: cachedMessages,
      question: 'my question',
      conversationId: 'conv-123',
      modelId: 'model-1',
      errorDetails,
      responsePending: false
    })
  })

  test('returns the knowledge group id in submit error state', async () => {
    const cachedMessages = [{ role: 'user', content: 'q' }]
    vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue({ messages: cachedMessages })
    vi.mocked(errorMapping.getErrorDetails).mockResolvedValue({ isRetryable: false, timestamp: new Date() })

    const result = await loadSubmitError('my question', 'model-1', 'conv-123', new Error('fail'), 'kg-1')

    expect(result).toMatchObject({ knowledgeGroupId: 'kg-1' })
  })

  test('returns empty messages when no cached conversation exists', async () => {
    vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)
    vi.mocked(errorMapping.getErrorDetails).mockResolvedValue({ isRetryable: false, timestamp: new Date() })

    const result = await loadSubmitError('q', 'model-1', null, new Error('fail'))

    expect(result.messages).toEqual([])
  })
})

describe('loadValidationError', () => {
  test('returns models, cached messages, and the error message', async () => {
    const cachedMessages = [{ role: 'user', content: 'q' }]
    vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue({ messages: cachedMessages })
    vi.mocked(messageBuilders.hasPendingResponse).mockReturnValue(false)

    const result = await loadValidationError('conv-123', 'my question', 'model-1', '"question" is required')

    expect(result).toMatchObject({
      models: mockModels,
      messages: cachedMessages,
      question: 'my question',
      conversationId: 'conv-123',
      modelId: 'model-1',
      errorMessage: '"question" is required',
      responsePending: false
    })
  })

  test('returns the knowledge group id in validation error state', async () => {
    const cachedMessages = [{ role: 'user', content: 'q' }]
    vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue({ messages: cachedMessages })
    vi.mocked(messageBuilders.hasPendingResponse).mockReturnValue(false)

    const result = await loadValidationError('conv-123', 'my question', 'model-1', 'error', 'kg-1')

    expect(result).toMatchObject({ knowledgeGroupId: 'kg-1' })
  })

  test('returns empty messages when no cached conversation exists', async () => {
    vi.mocked(modelsService.getModels).mockResolvedValue(mockModels)
    vi.mocked(conversationCache.getConversation).mockResolvedValue(null)

    const result = await loadValidationError(null, 'q', 'model-1', 'error')

    expect(result.messages).toEqual([])
  })
})

describe('resetConversation', () => {
  test('clears the conversation from cache', async () => {
    vi.mocked(conversationCache.clearConversation).mockResolvedValue(undefined)

    await resetConversation('conv-123')

    expect(conversationCache.clearConversation).toHaveBeenCalledWith('conv-123')
  })
})
