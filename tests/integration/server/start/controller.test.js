import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import nock from 'nock'

import { createServer } from '../../../../src/server/server.js'
import { cleanupChatApiMocks, setupChatApiErrorMock, setupChatApiMocks } from '../../../mocks/chat-api-handlers.js'
import { cleanupModelsApiMocks, setupModelsApiErrorMock, setupModelsApiMocks } from '../../../mocks/models-api-handlers.js'
import { setupKnowledgeGroupsMock, setupKnowledgeGroupsEmptyMock, setupKnowledgeGroupsErrorMock } from '../../../mocks/knowledge-api-handlers.js'
import { clearConversation } from '../../../../src/server/start/conversation-cache.js'
import { clearModelsCache } from '../../../../src/server/services/models-service.js'

describe('Start page', () => {
  let server

  beforeAll(async () => {
    clearModelsCache()
    server = await createServer()
    await server.initialize()
  })

  beforeEach(async () => {
    cleanupChatApiMocks()
    cleanupModelsApiMocks()
    clearModelsCache()
    await clearConversation('mock-conversation-123')
    setupKnowledgeGroupsMock()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    cleanupChatApiMocks()
    cleanupModelsApiMocks()
  })

  describe('GET /start', () => {
    test('renders the start page with the model selection form', async () => {
      setupModelsApiMocks()

      const response = await server.inject({ method: 'GET', url: '/start' })

      expect(response.statusCode).toBe(statusCodes.OK)

      const page = new JSDOM(response.result).window.document
      expect(page.querySelector('h2')?.textContent).toContain('Select AI model')
      expect(page.querySelectorAll('input[type="radio"]').length).toBeGreaterThan(0)
      expect(page.body.textContent).toContain('Sonnet 3.7')
      expect(page.querySelector('.app-conversation-container')).not.toBeNull()
    })

    test.each([
      ['returns a 500 error', () => setupModelsApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)],
      ['times out', () => setupModelsApiErrorMock(null, 'timeout')]
    ])('renders a server error page when the models API %s', async (_label, setup) => {
      setup()

      const response = await server.inject({ method: 'GET', url: '/start' })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)
      expect(new JSDOM(response.result).window.document.body.textContent).toContain('Sorry, there was a problem with the service request')
    })

    test('renders the start page with the knowledge group dropdown and an upload files link', async () => {
      setupModelsApiMocks()

      const response = await server.inject({ method: 'GET', url: '/start' })

      expect(response.statusCode).toBe(statusCodes.OK)

      const page = new JSDOM(response.result).window.document
      const select = page.querySelector('select[name="knowledgeGroupId"]')
      expect(select).not.toBeNull()
      expect(select.querySelector('option[value=""]')?.textContent?.trim()).toBe('No knowledge group')
      expect(select.querySelector('option[value="kg-1"]')?.textContent?.trim()).toBe('Test Knowledge Group')
      expect(page.querySelector('a[href="/upload"]')).not.toBeNull()
    })

    test('renders a server error page when the knowledge groups API fails', async () => {
      nock.cleanAll()
      setupModelsApiMocks()
      setupKnowledgeGroupsErrorMock()

      const response = await server.inject({ method: 'GET', url: '/start' })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)
      expect(new JSDOM(response.result).window.document.body.textContent).toContain('Sorry, there was a problem with the service request')
    })

    test('renders only the no-knowledge-group option when the knowledge groups API returns an empty list', async () => {
      nock.cleanAll()
      setupModelsApiMocks()
      setupKnowledgeGroupsEmptyMock()

      const response = await server.inject({ method: 'GET', url: '/start' })

      expect(response.statusCode).toBe(statusCodes.OK)

      const page = new JSDOM(response.result).window.document
      const select = page.querySelector('select[name="knowledgeGroupId"]')
      expect(select).not.toBeNull()
      const options = select.querySelectorAll('option')
      expect(options.length).toBe(1)
      expect(options[0].getAttribute('value')).toBe('')
    })
  })

  describe('POST /start', () => {
    test('redirects to the conversation page on success', async () => {
      setupModelsApiMocks()
      setupChatApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })

      expect(response.statusCode).toBe(statusCodes.SEE_OTHER)
      expect(response.headers.location).toMatch(/\/start\/mock-conversation-123/)
    })

    test('shows a validation error when the question is missing', async () => {
      setupModelsApiMocks()

      const response = await server.inject({ method: 'POST', url: '/start', payload: {} })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)
      expect(new JSDOM(response.result).window.document.querySelector('.govuk-error-summary')).not.toBeNull()
    })

    test('shows a validation error when the question exceeds the character limit', async () => {
      setupModelsApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/start/existing-conv-456',
        payload: { modelId: 'sonnet-3.7', question: 'f'.repeat(501) }
      })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

      const page = new JSDOM(response.result).window.document
      expect(page.querySelector('.govuk-error-summary')).not.toBeNull()
      expect(page.querySelector('form').getAttribute('action')).toContain('/start/existing-conv-456')
    })

    test('preserves previous conversation history when a validation error occurs', async () => {
      setupModelsApiMocks()
      setupChatApiMocks('plaintext')

      const postResponse = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })
      const conversationId = postResponse.headers.location.split('/start/')[1]

      await server.inject({ method: 'GET', url: postResponse.headers.location })
      await server.inject({ method: 'GET', url: postResponse.headers.location })

      const validationResponse = await server.inject({
        method: 'POST',
        url: `/start/${conversationId}`,
        payload: { modelId: 'sonnet-3.7', question: '' }
      })

      expect(validationResponse.statusCode).toBe(statusCodes.BAD_REQUEST)

      const page = new JSDOM(validationResponse.result).window.document
      expect(page.querySelector('.govuk-error-summary')).not.toBeNull()
      expect(page.body.textContent).toContain('What is UCD?')
      expect(page.querySelectorAll('.app-user-question').length).toBeGreaterThan(0)
    })

    test('shows a non-retryable error when the chat API returns 500', async () => {
      setupChatApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      const response = await server.inject({
        method: 'POST',
        url: '/start/error-conversation-789',
        payload: { modelId: 'sonnet-3.7', question: 'What is user centred design?' }
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const bodyText = new JSDOM(response.result).window.document.body.textContent
      expect(bodyText).toContain('Something went wrong and we cannot continue this conversation.')
      expect(bodyText).not.toContain('Wait a moment and try sending your message again')
    })

    test.each([
      [statusCodes.BAD_GATEWAY],
      [statusCodes.SERVICE_UNAVAILABLE],
      [statusCodes.GATEWAY_TIMEOUT],
      [statusCodes.TOO_MANY_REQUESTS]
    ])('shows a retryable error when the chat API returns %s', async (statusCode) => {
      setupChatApiErrorMock(statusCode)
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      const response = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is user centred design?' }
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const bodyText = new JSDOM(response.result).window.document.body.textContent
      expect(bodyText).toContain('Wait a moment and try sending your message again')
      expect(bodyText).not.toContain('Something went wrong and we cannot continue this conversation.')
    })

    test('shows a non-retryable error when the chat API returns 400', async () => {
      setupChatApiErrorMock(statusCodes.BAD_REQUEST)
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      const response = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is user centred design?' }
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const bodyText = new JSDOM(response.result).window.document.body.textContent
      expect(bodyText).toContain('Something went wrong and we cannot continue this conversation.')
      expect(bodyText).not.toContain('Wait a moment and try sending your message again')
    })

    test('shows a non-retryable error when the chat API connection times out', async () => {
      setupChatApiErrorMock(null, 'timeout')
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      const response = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is user centred design?' }
      })

      expect(response.statusCode).toBe(statusCodes.OK)
      expect(new JSDOM(response.result).window.document.body.textContent).toContain('Something went wrong and we cannot continue this conversation.')
    })

    test('includes conversationId in the clear link when a retryable error occurs mid-conversation', async () => {
      setupChatApiErrorMock(statusCodes.GATEWAY_TIMEOUT)
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      const response = await server.inject({
        method: 'POST',
        url: '/start/timeout-conversation-123',
        payload: { modelId: 'sonnet-3.7', question: 'What is user centred design?' }
      })

      expect(response.statusCode).toBe(statusCodes.OK)
      expect(new JSDOM(response.result).window.document.querySelector('a[href="/start/clear/timeout-conversation-123"]')).not.toBeNull()
    })

    test.each([
      [{ knowledgeGroupId: 'kg-1' }],
      [{ knowledgeGroupId: '' }]
    ])('redirects to the conversation page when a knowledge group is selected and when none is selected', async ({ knowledgeGroupId }) => {
      setupModelsApiMocks()
      setupChatApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?', knowledgeGroupId }
      })

      expect(response.statusCode).toBe(statusCodes.SEE_OTHER)
      expect(response.headers.location).toMatch(/\/start\/mock-conversation-123/)
    })

    test('preserves the selected knowledge group when a validation error occurs', async () => {
      setupModelsApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: '', knowledgeGroupId: 'kg-1' }
      })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

      const page = new JSDOM(response.result).window.document
      const select = page.querySelector('select[name="knowledgeGroupId"]')
      expect(select).not.toBeNull()
      const selectedOption = select.querySelector('option[selected]') || select.querySelector('option[value="kg-1"]')
      expect(selectedOption).not.toBeNull()
    })
  })

  describe('GET /start/{conversationId}', () => {
    test('renders cached placeholder messages immediately after a question is submitted', async () => {
      setupModelsApiMocks()
      setupChatApiMocks()

      const postResponse = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })

      const response = await server.inject({ method: 'GET', url: postResponse.headers.location })

      expect(response.statusCode).toBe(statusCodes.OK)

      const page = new JSDOM(response.result).window.document
      expect(page.querySelector('.app-user-question')).not.toBeNull()
      expect(page.querySelector('.app-assistant-response')).not.toBeNull()
    })

    test('renders the conversation from the API on a subsequent page load', async () => {
      setupModelsApiMocks()
      setupChatApiMocks('plaintext')

      const postResponse = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })

      await server.inject({ method: 'GET', url: postResponse.headers.location })
      const response = await server.inject({ method: 'GET', url: postResponse.headers.location })

      expect(response.statusCode).toBe(statusCodes.OK)

      const bodyText = new JSDOM(response.result).window.document.body.textContent
      expect(bodyText).toContain('What is UCD?')
      expect(bodyText).toContain('User-Centred Design (UCD) is a framework')
    })

    test('renders markdown responses as formatted HTML', async () => {
      setupModelsApiMocks()
      setupChatApiMocks('markdown')

      const postResponse = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })

      await server.inject({ method: 'GET', url: postResponse.headers.location })
      const response = await server.inject({ method: 'GET', url: postResponse.headers.location })

      expect(response.statusCode).toBe(statusCodes.OK)

      const page = new JSDOM(response.result).window.document
      expect(Array.from(page.querySelectorAll('h1')).some(h => h.textContent.includes('Crop Rotation Guide'))).toBe(true)
      expect(page.querySelector('table')).not.toBeNull()
    })

    test('falls back to empty messages when the API times out', async () => {
      cleanupChatApiMocks()
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      nock('http://host.docker.internal:3018')
        .get('/conversations/timeout-conv')
        .delay(150)
        .reply(200, { conversationId: 'timeout-conv', messages: [] })

      const response = await server.inject({ method: 'GET', url: '/start/timeout-conv' })

      expect(response.statusCode).toBe(statusCodes.OK)
      expect(new JSDOM(response.result).window.document.querySelectorAll('.app-user-question, .app-assistant-response').length).toBe(0)
    })

    test('returns 404 when the conversation is not found', async () => {
      cleanupChatApiMocks()
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      nock('http://host.docker.internal:3018')
        .get('/conversations/not-found')
        .reply(404, { error: 'Not found' })

      const response = await server.inject({ method: 'GET', url: '/start/not-found' })

      expect(response.statusCode).toBe(statusCodes.NOT_FOUND)
    })

    test('returns 500 when the API returns an unexpected error', async () => {
      cleanupChatApiMocks()
      setupModelsApiMocks()
      setupKnowledgeGroupsMock()

      nock('http://host.docker.internal:3018')
        .get('/conversations/error-conv')
        .delay(10)
        .reply(500, { error: 'Internal server error' })

      const response = await server.inject({ method: 'GET', url: '/start/error-conv' })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)
    })

    test('disables the knowledge group dropdown while a response is pending', async () => {
      setupModelsApiMocks()
      setupChatApiMocks()

      const postResponse = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })

      const response = await server.inject({ method: 'GET', url: postResponse.headers.location })

      expect(response.statusCode).toBe(statusCodes.OK)

      const page = new JSDOM(response.result).window.document
      const select = page.querySelector('select[name="knowledgeGroupId"]')
      expect(select).not.toBeNull()
      expect(select.disabled || select.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('GET /start/clear/{conversationId?}', () => {
    test('clears the conversation and redirects to /start', async () => {
      setupModelsApiMocks()
      setupChatApiMocks()

      const postResponse = await server.inject({
        method: 'POST',
        url: '/start',
        payload: { modelId: 'sonnet-3.7', question: 'What is UCD?' }
      })
      const conversationId = postResponse.headers.location.split('/start/')[1]

      const clearResponse = await server.inject({ method: 'GET', url: `/start/clear/${conversationId}` })

      expect(clearResponse.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
      expect(clearResponse.headers.location).toBe('/start')
    })

    test('redirects to /start when no conversationId is provided', async () => {
      const response = await server.inject({ method: 'GET', url: '/start/clear' })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/start')
    })
  })
})
