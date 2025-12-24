import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'
import { cleanupChatApiMocks, setupChatApiErrorMock, setupChatApiMocks } from '../../../mocks/chat-api-handlers.js'
import {
  cleanupModelsApiMocks,
  setupModelsApiErrorMock,
  setupModelsApiMocks
} from '../../../mocks/models-api-handlers.js'

describe('Start routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    cleanupChatApiMocks()
    cleanupModelsApiMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })

    cleanupChatApiMocks()
    cleanupModelsApiMocks()
  })

  test('GET /start when authenticated should return the start page', async () => {
    setupModelsApiMocks()

    const startResponse = await server.inject({
      method: 'GET',
      url: '/start'
    })

    expect(startResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(startResponse.result)
    const page = window.document

    // Check for model selection heading
    const heading = page.querySelector('h2')
    expect(heading?.textContent).toContain('Select AI model')

    // Check for model options
    const radioButtons = page.querySelectorAll('input[type="radio"]')
    expect(radioButtons.length).toBeGreaterThan(0)

    // Check for model names
    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sonnet 3.7')
    expect(bodyText).toContain('Haiku')

    // Check that the conversation component is present
    const conversationComponent = page.querySelector('.app-conversation-container')
    expect(conversationComponent).not.toBeNull()
  })

  test('POST /start with markdown response should render HTML elements correctly', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('markdown')

    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is **UCD**?'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(questionResponse.result)
    const page = window.document

    // Check the page contains the question and response from mock API
    const headings = page.querySelectorAll('h1')
    const hasMarkdownHeading = Array.from(headings).some(heading => heading.textContent.includes('Crop Rotation Guide'))
    expect(hasMarkdownHeading).toBe(true)

    const table = page.querySelector('table')
    const tableText = table.textContent
    expect(tableText).toContain('Year')
    expect(tableText).toContain('Crop')
    expect(tableText).toContain('Benefit')
  })

  test('POST /start with plaintext response should display text correctly', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('plaintext')

    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is UCD?'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(questionResponse.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('What is UCD?')
    expect(bodyText).toContain('AI assistant')
    expect(bodyText).toContain('User-Centred Design (UCD) is a framework')
  })

  test('POST /start with conversationId should continue existing conversation', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('plaintext')

    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start?conversationId=existing-conversation-123',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'Tell me more about that'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(questionResponse.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Tell me more about that')
    expect(bodyText).toContain('User-Centred Design (UCD)')

    // Check that the form action includes the conversationId
    const form = page.querySelector('form[action*="conversationId"]')
    expect(form).not.toBeNull()
    expect(form.getAttribute('action')).toContain('conversationId=mock-conversation-123')
  })

  test('POST /start without conversationId should start new conversation', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('plaintext')

    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is UCD?'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(questionResponse.result)
    const page = window.document

    // Check that the form action includes the conversationId from response
    const form = page.querySelector('form[action*="conversationId"]')
    expect(form).not.toBeNull()
    expect(form.getAttribute('action')).toContain('conversationId=mock-conversation-123')
  })

  test('POST /start with different models should send the selected model in the request', async () => {
    setupModelsApiMocks()
    setupChatApiMocks()

    const haikuResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'haiku',
        question: 'What is user centred design?'
      }
    })

    expect(haikuResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(haikuResponse.result)
    const page = window.document

    // Verify the selected model is preserved in the form
    const bodyText = page.body.textContent
    expect(bodyText).toContain('AI assistant')
    expect(bodyText).toContain('What is user centred design?')
    expect(bodyText).toContain('User-Centred Design (UCD)')
  })

  test('POST /start - when question not in request then should display validation error', async () => {
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {}
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('POST /start - when question length too short then should display validation error', async () => {
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: ''
      }
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('POST /start - when question length too long then should display validation error', async () => {
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start?conversationId=existing-conv-456',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'f'.repeat(501)
      }
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()

    // Check that conversationId is preserved in the form action
    const form = page.querySelector('form')
    expect(form.getAttribute('action')).toContain('conversationId=existing-conv-456')
  })

  test('POST /start - when chat API returns 500 INTERNAL_SERVER_ERROR error then should display error message', async () => {
    // Setup 500 error mock
    setupChatApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start?conversationId=error-conversation-789',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem getting a response. Please try again.')
    expect(bodyText).toContain('What is user centred design?') // Question should be preserved

    // Check that conversationId is preserved in the form action
    const form = page.querySelector('form')
    expect(form.getAttribute('action')).toContain('conversationId=error-conversation-789')
  })

  test('POST /start - when chat API returns 502 Bad Gateway then should display error message', async () => {
    // Setup 502 error mock
    setupChatApiErrorMock(statusCodes.BAD_GATEWAY)
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem getting a response. Please try again.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - when chat API returns 503 Service Unavailable then should display error message', async () => {
    // Setup 503 error mock
    setupChatApiErrorMock(statusCodes.SERVICE_UNAVAILABLE)
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem getting a response. Please try again.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - when chat API returns 504 Gateway Timeout then should display error message', async () => {
    // Setup 504 error mock
    setupChatApiErrorMock(statusCodes.GATEWAY_TIMEOUT)
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem getting a response. Please try again.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - when chat API connection times out then should display error message', async () => {
    // Setup network timeout mock
    setupChatApiErrorMock(null, 'timeout')
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem getting a response. Please try again.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('GET /start - when models API returns 500 error should display error page', async () => {
    // Setup 500 error mock for models API
    setupModelsApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)

    const response = await server.inject({
      method: 'GET',
      url: '/start',
    })

    expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

    const { window } = new JSDOM(response.result)
    const page = window.document

    // Check that error message is displayed
    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem with the service request')
  })

  test('GET /start - when models API times out should display error page', async () => {
    // Setup network timeout mock for models API
    setupModelsApiErrorMock(null, 'timeout')

    const response = await server.inject({
      method: 'GET',
      url: '/start'
    })

    expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

    const { window } = new JSDOM(response.result)
    const page = window.document

    // Check that error message is displayed
    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem with the service request')
  })

  test('GET /start/clear should clear conversation and redirect to start page', async () => {
    setupModelsApiMocks()
    setupChatApiMocks()

    // First, create a conversation by posting a question
    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    // Verify conversation has messages
    const { window: windowWithMessages } = new JSDOM(questionResponse.result)
    const pageWithMessages = windowWithMessages.document
    const conversationWithMessages = pageWithMessages.querySelector('.app-conversation-container')
    expect(conversationWithMessages).not.toBeNull()
    const messagesBeforeClear = conversationWithMessages.querySelectorAll('.app-user-question, .app-assistant-response')
    expect(messagesBeforeClear.length).toBeGreaterThan(0)

    // Now clear the conversation
    const clearResponse = await server.inject({
      method: 'GET',
      url: '/start/clear',
      headers: {
        cookie: questionResponse.headers['set-cookie']
      }
    })

    // Should redirect to start page
    expect(clearResponse.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(clearResponse.headers.location).toBe('/start')

    // Follow the redirect to verify the page is cleared
    const redirectResponse = await server.inject({
      method: 'GET',
      url: clearResponse.headers.location,
      headers: {
        cookie: clearResponse.headers['set-cookie'] || questionResponse.headers['set-cookie']
      }
    })

    expect(redirectResponse.statusCode).toBe(statusCodes.OK)

    const { window: windowAfterClear } = new JSDOM(redirectResponse.result)
    const pageAfterClear = windowAfterClear.document

    // Verify conversation container exists but has no messages
    const conversationAfterClear = pageAfterClear.querySelector('.app-conversation-container')
    expect(conversationAfterClear).not.toBeNull()

    // Check that there are no user questions or assistant responses
    const userQuestionsAfterClear = pageAfterClear.querySelectorAll('.app-user-question')
    const assistantResponsesAfterClear = pageAfterClear.querySelectorAll('.app-assistant-response')
    expect(userQuestionsAfterClear.length).toBe(0)
    expect(assistantResponsesAfterClear.length).toBe(0)

    // Verify the form is still present and functional
    const questionInput = pageAfterClear.querySelector('#question')
    expect(questionInput).not.toBeNull()
    expect(questionInput.value).toBe('')

    // Verify the clear conversation link is still present
    const clearLink = pageAfterClear.querySelector('a[href="/start/clear"]')
    expect(clearLink).not.toBeNull()
    expect(clearLink.textContent).toContain('Clear conversation')
  })
})
