import { describe, test, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Set a fast poll configuration before importing the module under test
const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.window.CHAT_CONFIG = {
  pollIntervalMs: 1,
  pollMaxAttempts: 5,
  pollBackoffMultiplier: 1,
  pollMaxIntervalMs: 10,
  pollTotalTimeoutMs: 50
}
// make history.pushState safe in jsdom
global.window.location.href = 'http://localhost/'

// Mock the helpers module to control fetchConversation and related DOM ops
vi.mock('../../../../src/client/common/helpers/chat-helpers.js', () => {
  return {
    findElement: (selector) => global.document.querySelector(selector),
    showLoadingIndicator: vi.fn(),
    hideLoadingIndicator: vi.fn(),
    renderAssistantMessage: vi.fn(),
    renderUserMessage: vi.fn(),
    renderInlineLoading: vi.fn(),
    replaceInlineLoadingWithAssistant: vi.fn(),
    replaceInlineLoadingWithError: vi.fn(),
    fetchConversation: vi.fn(),
    findAssistantMessage: vi.fn(),
    postChat: vi.fn(),
    setFormDisabled: vi.fn()
  }
})

const helpers = await import('../../../../src/client/common/helpers/chat-helpers.js')
const chat = await import('../../../../src/client/javascripts/chat.js')

describe('chat.js poll and submit handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('pollForResponse returns assistant when available', async () => {
    // simulate one fetchConversation returning a conversation with completed assistant
    const conversation = { messages: [{ messageId: 'u1', role: 'user' }, { messageId: 'a1', role: 'assistant', status: 'completed', content: 'ok', modelName: 'm', timestamp: Date.now() }] }
    helpers.fetchConversation.mockResolvedValue(conversation)
    helpers.findAssistantMessage.mockReturnValue({ userMessageIndex: 0, assistant: conversation.messages[1] })

    const result = await chat.pollForResponse('c1', 'u1')
    expect(result).toEqual(conversation.messages[1])
  })

  test('pollForResponse returns null when not found or timeout', async () => {
    // first, simulate conversation without user message
    helpers.fetchConversation.mockResolvedValue({ messages: [] })
    helpers.findAssistantMessage.mockReturnValue({ userMessageIndex: -1, assistant: null })
    const result = await chat.pollForResponse('c1', 'missing')
    expect(result).toBeNull()
  })

  test('handleFormSubmit posts, renders and replaces on assistant', async () => {
    // prepare DOM form
    const form = document.createElement('form')
    form.action = '/start'
    const textarea = document.createElement('textarea')
    textarea.id = 'question'
    textarea.value = 'hello'
    const radio = document.createElement('input')
    radio.type = 'radio'
    radio.name = 'modelId'
    radio.checked = true
    radio.value = 'm1'
    form.appendChild(textarea)
    form.appendChild(radio)

    // mock postChat to return conversation id & message id
    helpers.postChat.mockResolvedValue({ conversationId: 'c1', messageId: 'u1' })

    // prepare an assistant and ensure pollForResponse finds it by mocking
    const assistant = { status: 'completed', content: 'ok', modelName: 'm', timestamp: Date.now() }
    const conversation = { messages: [{ messageId: 'u1', role: 'user' }, assistant] }
    helpers.fetchConversation.mockResolvedValue(conversation)
    helpers.findAssistantMessage.mockReturnValue({ userMessageIndex: 0, assistant })

    // stub history.pushState to avoid JSDOM navigation errors
    global.window.history.pushState = () => {}

    await chat.handleFormSubmit({ preventDefault: () => {} }, form)

    expect(helpers.postChat).toHaveBeenCalled()
    expect(helpers.renderUserMessage).toHaveBeenCalled()
    expect(helpers.renderInlineLoading).toHaveBeenCalled()
    expect(helpers.replaceInlineLoadingWithAssistant).toHaveBeenCalled()
  })

  test('attachFormHooks attaches submit listener when form present', () => {
    const form = document.createElement('form')
    form.setAttribute('action', '/start')
    document.body.appendChild(form)

    chat.attachFormHooks()

    // verify the hook attached by checking dataset flag set by attachFormHooks
    expect(form.dataset.chatEnhanced).toBe('true')
  })
})
