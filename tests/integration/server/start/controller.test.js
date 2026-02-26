import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import nock from 'nock'

import { createServer } from '../../../../src/server/server.js'
import { cleanupChatApiMocks, setupChatApiErrorMock, setupChatApiMocks } from '../../../mocks/chat-api-handlers.js'
import {
  cleanupModelsApiMocks,
  setupModelsApiErrorMock,
  setupModelsApiMocks
} from '../../../mocks/models-api-handlers.js'
import { clearConversation } from '../../../../src/server/start/conversation-cache.js'
import { clearModelsCache } from '../../../../src/server/services/models-service.js'

describe('Start routes', () => {
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
    // Clear the shared mock conversation from cache
    await clearConversation('mock-conversation-123')
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

    // Expect 303 redirect on successful POST
    expect(questionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(questionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Follow redirect to conversation page (first load shows cached placeholder)
    const firstGetResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(firstGetResponse.statusCode).toBe(statusCodes.OK)

    // Make second GET request to simulate refresh and fetch real API response
    const conversationResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(conversationResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(conversationResponse.result)
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

    // Expect 303 redirect on successful POST
    expect(questionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(questionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Follow redirect to conversation page (first load shows cached placeholder)
    const firstGetResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(firstGetResponse.statusCode).toBe(statusCodes.OK)

    // Make second GET request to simulate refresh and fetch real API response
    const conversationResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(conversationResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(conversationResponse.result)
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
      url: '/start/existing-conversation-123',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'Tell me more about that'
      }
    })

    // Expect 303 redirect on successful POST
    expect(questionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(questionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Follow redirect to conversation page (first load shows cached placeholder)
    const firstGetResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(firstGetResponse.statusCode).toBe(statusCodes.OK)

    // Make second GET request to simulate refresh and fetch real API response
    const conversationResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(conversationResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(conversationResponse.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Tell me more about that')
    expect(bodyText).toContain('User-Centred Design (UCD)')

    // Check that the form action includes the conversationId
    const form = page.querySelector('form[action*="mock-conversation-123"]')
    expect(form).not.toBeNull()
    expect(form.getAttribute('action')).toContain('/start/mock-conversation-123')
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

    // Expect 303 redirect on successful POST
    expect(questionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(questionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Follow redirect to conversation page
    const conversationResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(conversationResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(conversationResponse.result)
    const page = window.document

    // Check that the form action includes the conversationId from response
    const form = page.querySelector('form[action*="mock-conversation-123"]')
    expect(form).not.toBeNull()
    expect(form.getAttribute('action')).toContain('/start/mock-conversation-123')
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

    // Expect 303 redirect on successful POST
    expect(haikuResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(haikuResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Follow redirect to conversation page (first load shows cached placeholder)
    const firstGetResponse = await server.inject({
      method: 'GET',
      url: haikuResponse.headers.location
    })

    expect(firstGetResponse.statusCode).toBe(statusCodes.OK)

    // Make second GET request to simulate refresh and fetch real API response
    const conversationResponse = await server.inject({
      method: 'GET',
      url: haikuResponse.headers.location
    })

    expect(conversationResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(conversationResponse.result)
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
      url: '/start/existing-conv-456',
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
    expect(form.getAttribute('action')).toContain('/start/existing-conv-456')
  })

  test('POST /start - validation error should preserve cached conversation and question', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('plaintext')

    // First, create a conversation by posting a valid question
    const firstQuestionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is UCD?'
      }
    })

    // Expect 303 redirect on successful POST
    expect(firstQuestionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(firstQuestionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Extract conversationId from redirect location
    const conversationId = firstQuestionResponse.headers.location.split('/start/')[1]

    // Follow redirect to populate cache (first GET returns cached placeholder)
    await server.inject({
      method: 'GET',
      url: firstQuestionResponse.headers.location
    })

    // Second GET fetches real API response and updates cache
    await server.inject({
      method: 'GET',
      url: firstQuestionResponse.headers.location
    })

    // Now submit an invalid (empty) question to the same conversation
    const validationErrorResponse = await server.inject({
      method: 'POST',
      url: `/start/${conversationId}`,
      payload: {
        modelId: 'sonnet-3.7',
        question: ''
      }
    })

    expect(validationErrorResponse.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(validationErrorResponse.result)
    const page = window.document

    // Check that error summary is displayed
    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()

    // Check that the previous conversation is still displayed
    const bodyText = page.body.textContent
    expect(bodyText).toContain('What is UCD?')
    expect(bodyText).toContain('User-Centred Design (UCD) is a framework')

    // Check that conversationId is preserved in the form action
    const form = page.querySelector('form')
    expect(form.getAttribute('action')).toContain(`/start/${conversationId}`)

    // Verify conversation messages are displayed
    const userQuestions = page.querySelectorAll('.app-user-question')
    const assistantResponses = page.querySelectorAll('.app-assistant-response')
    expect(userQuestions.length).toBeGreaterThan(0)
    expect(assistantResponses.length).toBeGreaterThan(0)
  })

  test('POST /start - validation error with question too long should preserve cached conversation and question', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('plaintext')

    // First, create a conversation
    const firstQuestionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    // Expect 303 redirect on successful POST
    expect(firstQuestionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(firstQuestionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Extract conversationId from redirect location
    const conversationId = firstQuestionResponse.headers.location.split('/start/')[1]

    // Follow redirect to populate cache (first GET returns cached placeholder)
    await server.inject({
      method: 'GET',
      url: firstQuestionResponse.headers.location
    })

    // Second GET fetches real API response and updates cache
    await server.inject({
      method: 'GET',
      url: firstQuestionResponse.headers.location
    })

    // Submit a question that's too long
    const longQuestion = 'q'.repeat(501)
    const validationErrorResponse = await server.inject({
      method: 'POST',
      url: `/start/${conversationId}`,
      payload: {
        modelId: 'sonnet-3.7',
        question: longQuestion
      }
    })

    expect(validationErrorResponse.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(validationErrorResponse.result)
    const page = window.document

    // Check that error summary is displayed
    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()

    // Check that the previous conversation is still displayed
    const bodyText = page.body.textContent
    expect(bodyText).toContain('What is user centred design?')
    expect(bodyText).toContain('User-Centred Design (UCD)')

    // Check that the invalid question is preserved in the textarea
    const questionTextarea = page.querySelector('#question')
    expect(questionTextarea.value).toBe(longQuestion)

    // Check that conversationId is preserved
    const form = page.querySelector('form')
    expect(form.getAttribute('action')).toContain(`/start/${conversationId}`)

    // Verify conversation messages are displayed
    const userQuestions = page.querySelectorAll('.app-user-question')
    const assistantResponses = page.querySelectorAll('.app-assistant-response')
    expect(userQuestions.length).toBeGreaterThan(0)
    expect(assistantResponses.length).toBeGreaterThan(0)
  })

  test('POST /start - when chat API returns 500 INTERNAL_SERVER_ERROR should display non-retryable error message', async () => {
    // Setup 500 error mock
    setupChatApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start/error-conversation-789',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).not.toContain('Wait a moment and try sending your message again')
    expect(bodyText).toContain('What is user centred design?') // Question should be preserved

    expect(bodyText).toContain('System message')
    expect(bodyText).toMatch(/System message\s+at\s+\d{1,2}:\d{2}(am|pm)/i)

    const form = page.querySelector('form')
    expect(form.getAttribute('action')).toContain('/start/error-conversation-789')

    const clearLink = page.querySelector('a[href="/start/clear/error-conversation-789"]')
    expect(clearLink).not.toBeNull()
    expect(clearLink.textContent).toContain('Start a new conversation')
  })

  test('POST /start - when chat API returns 502 Bad Gateway should display retryable error message', async () => {
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
    expect(bodyText).toContain('Wait a moment and try sending your message again')
    expect(bodyText).not.toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).toContain('What is user centred design?')

    expect(bodyText).toContain('System message')
    expect(bodyText).toMatch(/System message\s+at\s+\d{1,2}:\d{2}(am|pm)/i)

    const clearLink = page.querySelector('a[href="/start/clear"]')
    expect(clearLink).not.toBeNull()
    expect(clearLink.textContent).toContain('start a new conversation')
  })

  test('POST /start - when chat API returns 503 Service Unavailable should display retryable error message', async () => {
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
    expect(bodyText).toContain('Wait a moment and try sending your message again')
    expect(bodyText).not.toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - when chat API returns 504 Gateway Timeout should display retryable error message', async () => {
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
    expect(bodyText).toContain('Wait a moment and try sending your message again')
    expect(bodyText).not.toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - when chat API connection times out should display non-retryable error message', async () => {
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
    expect(bodyText).toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).not.toContain('Wait a moment and try sending your message again')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - when chat API returns 400 BAD_REQUEST should display non-retryable error message', async () => {
    setupChatApiErrorMock(statusCodes.BAD_REQUEST)
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
    expect(bodyText).toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).not.toContain('Wait a moment and try sending your message again')
    expect(bodyText).toContain('What is user centred design?')

    const clearLink = page.querySelector('a[href="/start/clear"]')
    expect(clearLink).not.toBeNull()
    expect(clearLink.textContent).toContain('Start a new conversation')
  })

  test('POST /start - when chat API returns 429 TOO_MANY_REQUESTS should display retryable error message', async () => {
    setupChatApiErrorMock(statusCodes.TOO_MANY_REQUESTS)
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
    expect(bodyText).toContain('Wait a moment and try sending your message again')
    expect(bodyText).not.toContain('Something went wrong and we cannot continue this conversation.')
    expect(bodyText).toContain('What is user centred design?')
  })

  test('POST /start - retryable error with conversationId should include conversationId in "start a new conversation" link', async () => {
    setupChatApiErrorMock(statusCodes.GATEWAY_TIMEOUT)
    setupModelsApiMocks()

    const response = await server.inject({
      method: 'POST',
      url: '/start/timeout-conversation-123',
      payload: {
        modelId: 'sonnet-3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Wait a moment and try sending your message again')
    expect(bodyText).toContain('If this keeps happening')
    expect(bodyText).toContain('What is user centred design?')

    // Check that "start a new conversation" link includes conversationId
    const clearLink = page.querySelector('a[href="/start/clear/timeout-conversation-123"]')
    expect(clearLink).not.toBeNull()
    expect(clearLink.textContent).toContain('start a new conversation')
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

    // Expect 303 redirect on successful POST
    expect(questionResponse.statusCode).toBe(statusCodes.SEE_OTHER)
    expect(questionResponse.headers.location).toMatch(/\/start\/mock-conversation-123/)

    // Follow redirect to conversation page to verify messages
    const conversationResponse = await server.inject({
      method: 'GET',
      url: questionResponse.headers.location
    })

    expect(conversationResponse.statusCode).toBe(statusCodes.OK)

    // Verify conversation has messages (cached user question + placeholder)
    const { window: windowWithMessages } = new JSDOM(conversationResponse.result)
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

  test('GET /start/clear/{conversationId} should clear specific conversation and redirect', async () => {
    setupModelsApiMocks()

    const clearResponse = await server.inject({
      method: 'GET',
      url: '/start/clear/some-conversation-id'
    })

    expect(clearResponse.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(clearResponse.headers.location).toBe('/start')
  })

  test('GET /start/{conversationId} - should display conversation when API returns successfully', async () => {
    setupModelsApiMocks()
    setupChatApiMocks('plaintext')

    const response = await server.inject({
      method: 'GET',
      url: '/start/mock-conversation-123'
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('AI assistant')
  })

  test('GET /start/{conversationId} when API times out should show empty conversation', async () => {
    cleanupChatApiMocks()
    setupModelsApiMocks()

    nock('http://host.docker.internal:3018')
      .get('/conversations/timeout-conv')
      .delay(1500)
      .reply(200, { conversationId: 'timeout-conv', messages: [] })

    const response = await server.inject({
      method: 'GET',
      url: '/start/timeout-conv'
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const messages = page.querySelectorAll('.app-user-question, .app-assistant-response')
    expect(messages.length).toBe(0)
  })

  test('GET /start/{conversationId} when API returns 404 should show not found', async () => {
    cleanupChatApiMocks()
    setupModelsApiMocks()

    nock('http://host.docker.internal:3018')
      .get('/conversations/not-found')
      .reply(404, { error: 'Not found' })

    const response = await server.inject({
      method: 'GET',
      url: '/start/not-found'
    })

    expect(response.statusCode).toBe(statusCodes.NOT_FOUND)
  })

  test('GET /start/{conversationId} when API returns 500 after timeout should show server error', async () => {
    cleanupChatApiMocks()
    setupModelsApiMocks()

    nock('http://host.docker.internal:3018')
      .get('/conversations/error-conv')
      .delay(500)
      .reply(500, { error: 'Internal server error' })

    const response = await server.inject({
      method: 'GET',
      url: '/start/error-conv'
    })

    expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)
  })

  describe('models API error handling (isolated server to avoid cache pollution)', () => {
    let isolatedServer

    beforeAll(async () => {
      clearModelsCache()
      isolatedServer = await createServer()
      await isolatedServer.initialize()
    })

    afterAll(async () => {
      await isolatedServer.stop({ timeout: 0 })
    })

    beforeEach(() => {
      cleanupModelsApiMocks()
      clearModelsCache()
    })

    test('GET /start - when models API returns 500 error should display error page', async () => {
      setupModelsApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)

      const response = await isolatedServer.inject({
        method: 'GET',
        url: '/start'
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

      const { window } = new JSDOM(response.result)
      const bodyText = window.document.body.textContent
      expect(bodyText).toContain('Sorry, there was a problem with the service request')
    })

    test('GET /start - when models API times out should display error page', async () => {
      setupModelsApiErrorMock(null, 'timeout')

      const response = await isolatedServer.inject({
        method: 'GET',
        url: '/start'
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

      const { window } = new JSDOM(response.result)
      const bodyText = window.document.body.textContent
      expect(bodyText).toContain('Sorry, there was a problem with the service request')
    })
  })
})
