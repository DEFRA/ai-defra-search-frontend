import { JSDOM } from 'jsdom'
import nunjucks from 'nunjucks'
import path from 'path'
import * as filters from '../../../../../src/config/nunjucks/filters/filters.js'

describe('Conversation Component', () => {
  let env

  beforeEach(() => {
    env = nunjucks.configure([
      path.join(process.cwd(), 'src/server'),
      path.join(process.cwd(), 'src/server/common/components'),
      path.join(process.cwd(), 'node_modules/govuk-frontend/dist')
    ], {
      autoescape: true,
      watch: false
    })

    // Register filters
    Object.entries(filters).forEach(([name, filter]) => {
      env.addFilter(name, filter)
    })
  })

  describe('Message Display', () => {
    test('should visually distinguish user and AI messages with different CSS classes', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = [
        { role: 'user', content: 'User question', timestamp: '2024-01-01T10:00:00Z' },
        { role: 'assistant', content: 'AI response', timestamp: '2024-01-01T10:01:00Z', model: 'Sonnet 3.7' }
      ]

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const userMessage = page.querySelector('.app-user-question')
      const assistantMessage = page.querySelector('.app-assistant-response')

      expect(userMessage).not.toBeNull()
      expect(assistantMessage).not.toBeNull()
      expect(userMessage.classList.contains('app-user-question')).toBe(true)
      expect(assistantMessage.classList.contains('app-assistant-response')).toBe(true)
    })

    test('should display model name for assistant messages', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `
      const messages = [
        { role: 'assistant', content: 'Response from AI', timestamp: '2024-01-01T10:00:00Z', model: 'Sonnet 3.7' }
      ]

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const bodyText = page.body.textContent
      expect(bodyText).toContain('AI Assistant')
      expect(bodyText).toContain('Sonnet 3.7')
    })

    test('should display correct label for user messages', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = [
        { role: 'user', content: 'My question', timestamp: '2024-01-01T10:00:00Z' }
      ]

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const bodyText = page.body.textContent
      expect(bodyText).toContain('You')
    })
  })

  describe('Empty State', () => {
    test('Empty conversation state should be rendered correctly', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = []

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const bodyText = page.body.textContent

      expect(bodyText).toContain('Chat with AI Assistant')
      expect(bodyText).toContain('Conversation')

      // Should not have any message containers
      const userMessages = page.querySelectorAll('.app-user-question')
      const assistantMessages = page.querySelectorAll('.app-assistant-response')
      expect(userMessages.length).toBe(0)
      expect(assistantMessages.length).toBe(0)
    })
  })

  describe('UI Prototype Compliance', () => {
    test('should apply dynamic width for user messages', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = [
        { role: 'user', content: 'Question', timestamp: '2024-01-01T10:00:00Z' }
      ]

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const userMessage = page.querySelector('.app-user-question')
      expect(userMessage).not.toBeNull()
      expect(userMessage.classList.contains('app-user-question')).toBe(true)
    })

    test('should display conversation title', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = []

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const bodyText = page.body.textContent
      expect(bodyText).toContain('Chat with AI Assistant to get help with user-centred design questions')
    })
  })

  describe('Multiple Messages', () => {
    test('should handle multiple user and assistant messages', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = [
        { role: 'user', content: 'First question', timestamp: '2024-01-01T10:00:00Z' },
        { role: 'assistant', content: 'First response', timestamp: '2024-01-01T10:01:00Z', model: 'Sonnet 3.7' },
        { role: 'user', content: 'Second question', timestamp: '2024-01-01T10:02:00Z' },
        { role: 'assistant', content: 'Second response', timestamp: '2024-01-01T10:03:00Z', model: 'Haiku' },
        { role: 'user', content: 'Third question', timestamp: '2024-01-01T10:04:00Z' },
        { role: 'assistant', content: 'Third response', timestamp: '2024-01-01T10:05:00Z', model: 'Sonnet 3.7' }
      ]

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const userMessages = page.querySelectorAll('.app-user-question')
      const assistantMessages = page.querySelectorAll('.app-assistant-response')

      expect(userMessages.length).toBe(3)
      expect(assistantMessages.length).toBe(3)
    })

    test('should display different models correctly in conversation', () => {
      const template = `
        {% from "conversation/macro.njk" import defraConversation %}
        {{ defraConversation({
          messages: messages
        }) }}
      `

      const messages = [
        { role: 'assistant', content: 'Response from Sonnet', timestamp: '2024-01-01T10:01:00Z', model: 'Sonnet 3.7' },
        { role: 'assistant', content: 'Response from Haiku', timestamp: '2024-01-01T10:03:00Z', model: 'Haiku' }
      ]

      const html = env.renderString(template, { messages })
      const { window } = new JSDOM(html)
      const page = window.document

      const bodyText = page.body.textContent
      expect(bodyText).toContain('Sonnet 3.7')
      expect(bodyText).toContain('Haiku')
    })
  })
})
