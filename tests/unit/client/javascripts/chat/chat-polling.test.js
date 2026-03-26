// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { initChatPolling } from '../../../../../src/client/javascripts/chat/chat-polling.js'

const CONVERSATION_ID = 'test-conv-123'

const buildDOM = ({
  responsePending = 'true',
  includePendingNotice = true
} = {}) => {
  document.body.innerHTML = `
    <div
      id="ai-status"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="govuk-visually-hidden"
    ></div>
    <div
      class="app-conversation-container"
      data-response-pending="${responsePending}"
      data-conversation-id="${CONVERSATION_ID}"
    >
      <div data-nojs-controls>
        <div data-js-placeholder-text>AI agent is responding, refresh to see latest response</div>
        <a data-refresh-btn href="/start/${CONVERSATION_ID}">Refresh</a>
      </div>
      ${includePendingNotice ? '<div data-js-pending-notice>Please wait...</div>' : ''}
      <div data-chat-loading aria-hidden="true" hidden>
        <span class="app-chat-loading__text">AI assistant is typing</span>
      </div>
    </div>
  `
}

const buildResponseHTML = (responsePending) =>
  `<html><body><div class="app-conversation-container" data-response-pending="${responsePending}"></div></body></html>`

const mockOkResponse = (responsePending) => ({
  ok: true,
  text: () => Promise.resolve(buildResponseHTML(responsePending))
})

describe('initChatPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('location', { reload: vi.fn() })
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('is a no-op when data-response-pending is not "true"', () => {
    buildDOM({ responsePending: 'false' })
    initChatPolling()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('is a no-op when conversation container is absent', () => {
    initChatPolling()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('is a no-op when conversationId data attribute is missing', () => {
    document.body.innerHTML = `
      <div class="app-conversation-container" data-response-pending="true"></div>
    `
    initChatPolling()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('non-JS controls are present in the DOM (hidden via .js-enabled CSS, not the hidden attribute)', () => {
    buildDOM()
    expect(document.querySelector('[data-nojs-controls]')).not.toBeNull()
    expect(document.querySelector('[data-js-pending-notice]')).not.toBeNull()
    expect(document.querySelector('[data-nojs-controls]').hasAttribute('hidden')).toBe(false)
  })

  test('shows the loading indicator when response is pending', () => {
    buildDOM()
    initChatPolling()
    expect(document.querySelector('[data-chat-loading]').hasAttribute('hidden')).toBe(false)
  })

  test('sets ai-status text when loading starts', () => {
    buildDOM()
    initChatPolling()
    expect(document.getElementById('ai-status').textContent).toBe(
      'AI assistant is generating a response'
    )
  })

  test('polls GET /start/{conversationId} via fetch after interval', async () => {
    buildDOM()
    fetch.mockResolvedValue(mockOkResponse('true'))
    initChatPolling()
    await vi.runOnlyPendingTimersAsync()
    expect(fetch).toHaveBeenCalledWith(`/start/${CONVERSATION_ID}`)
  })

  test('reloads the page when data-response-pending becomes false', async () => {
    buildDOM()
    fetch.mockResolvedValue(mockOkResponse('false'))
    initChatPolling()
    await vi.runOnlyPendingTimersAsync()
    expect(window.location.reload).toHaveBeenCalled()
  })

  test('clears ai-status text when response arrives', async () => {
    buildDOM()
    fetch.mockResolvedValue(mockOkResponse('false'))
    initChatPolling()
    await vi.runOnlyPendingTimersAsync()
    expect(document.getElementById('ai-status').textContent).toBe('')
  })

  test('hides the loading indicator once response arrives', async () => {
    buildDOM()
    fetch.mockResolvedValue(mockOkResponse('false'))
    initChatPolling()
    await vi.runOnlyPendingTimersAsync()
    expect(document.querySelector('[data-chat-loading]').hasAttribute('hidden')).toBe(true)
  })

  test('continues polling while response is still pending', async () => {
    buildDOM()
    fetch
      .mockResolvedValueOnce(mockOkResponse('true'))
      .mockResolvedValueOnce(mockOkResponse('false'))
    initChatPolling()
    await vi.runOnlyPendingTimersAsync()
    await vi.runOnlyPendingTimersAsync()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(window.location.reload).toHaveBeenCalled()
  })

  test('retries when fetch returns an HTTP error status', async () => {
    buildDOM()
    fetch.mockResolvedValue({ ok: false, status: 500 })
    initChatPolling()
    for (let i = 0; i < 5; i++) {
      await vi.runOnlyPendingTimersAsync()
    }
    expect(fetch).toHaveBeenCalledTimes(5)
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  test('retries on fetch error without exceeding max retries', async () => {
    buildDOM()
    fetch.mockRejectedValue(new Error('network error'))
    initChatPolling()
    for (let i = 0; i < 5; i++) {
      await vi.runOnlyPendingTimersAsync()
    }
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('does not reload the page after exhausting max retries', async () => {
    buildDOM()
    fetch.mockRejectedValue(new Error('network error'))
    initChatPolling()
    for (let i = 0; i < 6; i++) {
      await vi.runOnlyPendingTimersAsync()
    }
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  test('hides loading indicator after exhausting max retries', async () => {
    buildDOM()
    fetch.mockRejectedValue(new Error('network error'))
    initChatPolling()
    for (let i = 0; i < 6; i++) {
      await vi.runOnlyPendingTimersAsync()
    }
    expect(document.querySelector('[data-chat-loading]').hasAttribute('hidden')).toBe(true)
  })

  test('still retries on the 5th failure (boundary check)', async () => {
    buildDOM()
    fetch.mockRejectedValue(new Error('network error'))
    initChatPolling()
    for (let i = 0; i < 5; i++) {
      await vi.runOnlyPendingTimersAsync()
    }
    expect(fetch).toHaveBeenCalledTimes(5)
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  test('uses a 2000ms poll interval before the first fetch', async () => {
    buildDOM()
    fetch.mockResolvedValue(mockOkResponse('false'))
    initChatPolling()
    vi.advanceTimersByTime(1999)
    expect(fetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    await Promise.resolve()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('does not throw when ai-status element is absent during showLoading', () => {
    buildDOM()
    document.getElementById('ai-status').remove()
    expect(() => initChatPolling()).not.toThrow()
  })

  test('does not throw when data-chat-loading element is absent during showLoading', () => {
    buildDOM()
    document.querySelector('[data-chat-loading]').remove()
    expect(() => initChatPolling()).not.toThrow()
  })

  test('does not throw when ai-status element is absent during hideLoading', async () => {
    buildDOM()
    document.getElementById('ai-status').remove()
    fetch.mockResolvedValue(mockOkResponse('false'))
    initChatPolling()
    await expect(vi.runOnlyPendingTimersAsync()).resolves.not.toThrow()
  })

  test('does not throw when data-chat-loading element is absent during hideLoading', async () => {
    buildDOM()
    document.querySelector('[data-chat-loading]').remove()
    fetch.mockResolvedValue(mockOkResponse('false'))
    initChatPolling()
    await expect(vi.runOnlyPendingTimersAsync()).resolves.not.toThrow()
  })
})
