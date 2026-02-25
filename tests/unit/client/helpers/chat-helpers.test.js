/* global HTMLElement */
import { describe, test, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

import * as helpers from '../../../../src/client/common/helpers/chat-helpers.js'

describe('chat-helpers DOM helpers', () => {
  let window
  let document

  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><div class="app-conversation-container"></div><div id="ai-status"></div><div id="loading-indicator" hidden></div></body></html>')
    window = dom.window
    document = window.document
    global.window = window
    global.document = document
    // jsdom doesn't implement scrollIntoView / focus - stub them
    if (typeof global.HTMLElement !== 'function') {
      global.HTMLElement = window.HTMLElement
    }
    if (typeof global.Element === 'undefined') {
      global.Element = window.Element
    }
    if (!global.Element.prototype.scrollIntoView) {
      global.Element.prototype.scrollIntoView = function () {}
    }
    // also ensure the jsdom window prototypes are stubbed
    if (window && window.Element && !window.Element.prototype.scrollIntoView) {
      window.Element.prototype.scrollIntoView = function () {}
    }
    if (!global.HTMLElement.prototype.focus) {
      global.HTMLElement.prototype.focus = function () {}
    }
    if (window && window.HTMLElement && !window.HTMLElement.prototype.focus) {
      window.HTMLElement.prototype.focus = function () {}
    }
  })

  test('showLoadingIndicator and hideLoadingIndicator toggle status and indicator', () => {
    const status = document.querySelector('#ai-status')
    const indicator = document.querySelector('#loading-indicator')

    helpers.showLoadingIndicator()
    expect(status.textContent).toContain('AI assistant is generating a response')
    expect(indicator.hidden).toBe(false)

    helpers.hideLoadingIndicator()
    expect(status.textContent).toBe('')
    expect(indicator.hidden).toBe(true)
  })

  test('renderUserMessage appends user message, timestamp and placeholder and scrolls', () => {
    const container = document.querySelector('.app-conversation-container')
    helpers.renderUserMessage('hello', 'msg-1')

    const wrapper = container.querySelector('.app-user-question-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper.dataset.messageId).toBe('msg-1')

    const user = container.querySelector('.app-user-question p')
    expect(user.textContent).toBe('hello')

    const placeholder = container.querySelector('.app-assistant-placeholder')
    expect(placeholder).toBeTruthy()
    expect(placeholder.dataset.forMessageId).toBe('msg-1')
  })

  test('renderAssistantMessage appends assistant content and focuses element', () => {
    const container = document.querySelector('.app-conversation-container')
    // ensure an element is focusable in jsdom
    const realFocus = HTMLElement.prototype.focus
    HTMLElement.prototype.focus = function () { /* noop */ }

    helpers.renderAssistantMessage('<p>resp</p>', 'gpt', Date.now())

    const assistant = container.querySelector('.app-assistant-response')
    expect(assistant).toBeTruthy()
    expect(assistant.innerHTML).toContain('resp')

    HTMLElement.prototype.focus = realFocus
  })

  test('renderInlineLoading and replaceInlineLoadingWithAssistant and replaceInlineLoadingWithError', () => {
    const container = document.querySelector('.app-conversation-container')
    // create placeholder
    const placeholder = document.createElement('div')
    placeholder.className = 'app-assistant-placeholder'
    placeholder.dataset.forMessageId = 'u1'
    container.appendChild(placeholder)

    helpers.renderInlineLoading('u1')
    expect(placeholder.innerHTML).toContain('AI assistant is typing')

    helpers.replaceInlineLoadingWithAssistant('u1', '<p>done</p>', 'model-x', Date.now())
    expect(placeholder.innerHTML).toContain('done')

    // re-add placeholder for error path
    const placeholder2 = document.createElement('div')
    placeholder2.className = 'app-assistant-placeholder'
    placeholder2.dataset.forMessageId = 'u2'
    container.appendChild(placeholder2)

    helpers.replaceInlineLoadingWithError('u2', { isRetryable: true })
    expect(placeholder2.innerHTML).toContain('There is a problem')
  })

  test('findAssistantMessage returns indices and assistant', () => {
    const conv = { messages: [{ messageId: 'u1', role: 'user' }, { messageId: 'a1', role: 'assistant' }] }
    const res = helpers.findAssistantMessage(conv, 'u1')
    expect(res.userMessageIndex).toBe(0)
    expect(res.assistant).toEqual(conv.messages[1])

    const res2 = helpers.findAssistantMessage(conv, 'missing')
    expect(res2.userMessageIndex).toBe(-1)
    expect(res2.assistant).toBeNull()
  })

  test('fetchConversation throws on non-ok and returns json on ok', async () => {
    global.fetch = async (url) => ({ ok: true, json: async () => ({ ok: true }) })
    const j = await helpers.fetchConversation('cid')
    expect(j.ok).toBe(true)

    global.fetch = async () => ({ ok: false, status: 500 })
    await expect(helpers.fetchConversation('cid')).rejects.toThrow()
  })

  test('postChat posts and throws on non-ok', async () => {
    global.fetch = async (url, opts) => ({ ok: true, json: async () => ({ conversationId: 'c', messageId: 'm' }) })
    const r = await helpers.postChat('q', 'm1', null)
    expect(r.conversationId).toBe('c')

    global.fetch = async () => ({ ok: false })
    await expect(helpers.postChat('q', 'm1', null)).rejects.toThrow()
  })

  test('setFormDisabled toggles elements', () => {
    const form = document.createElement('form')
    const textarea = document.createElement('textarea')
    textarea.id = 'question'
    const button = document.createElement('button')
    button.type = 'submit'
    form.appendChild(textarea)
    form.appendChild(button)

    helpers.setFormDisabled(form, true)
    expect(button.disabled).toBe(true)
    expect(textarea.disabled).toBe(true)

    helpers.setFormDisabled(form, false)
    expect(button.disabled).toBe(false)
    expect(textarea.disabled).toBe(false)
  })
})
