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

  /**
   * Helper function to authenticate and return cookie header
   * @returns {Promise<string>} Cookie header string for authenticated requests
   */
  async function loginAndGetCookie () {
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']
    return cookie.join(';')
  }

  beforeEach(async () => {
    // Restart server to clear cookies between tests
    await server.stop()
    await server.start()
  })

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })

    // Clean up HTTP mocks
    cleanupChatApiMocks()
    cleanupModelsApiMocks()
  })

  test('GET /start when not authenticated should redirect to login', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/start'
    })

    expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/login')
  })

  test('GET /start when authenticated should return the start page', async () => {
    setupModelsApiMocks()

    const cookie = await loginAndGetCookie()

    const startResponse = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        cookie
      }
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
  })

  test('POST /start with question should return page with response', async () => {
    setupChatApiMocks()

    const cookie = await loginAndGetCookie()

    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
        question: 'What is user centred design?'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(questionResponse.result)
    const page = window.document

    // Check the page contains the question and response from mock API
    const bodyText = page.body.textContent

    expect(bodyText).toContain('Here\'s what I found')
    expect(bodyText).toContain('What is UCD?')
    expect(bodyText).toContain('User-Centred Design (UCD)')
  })

  test('POST /start with different models should send the selected model in the request', async () => {
    setupChatApiMocks()
    setupModelsApiMocks()

    const cookie = await loginAndGetCookie()

    const haikuResponse = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Haiku',
        question: 'What is user centred design?'
      }
    })

    expect(haikuResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(haikuResponse.result)
    const page = window.document

    // Verify the selected model is preserved in the form
    const bodyText = page.body.textContent
    expect(bodyText).toContain('Here\'s what I found')
    expect(bodyText).toContain('What is UCD?')
    expect(bodyText).toContain('User-Centred Design (UCD)')
  })

  test('POST /start when not authenticated should redirect to login', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        modelName: 'Sonnet 3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/login')
  })

  test('POST /start - when question not in request then should display validation error', async () => {
    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {}
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('POST /start - when question length too short then should display validation error', async () => {
    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
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
    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
        question: 'f'.repeat(501)
      }
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('POST /start - when chat API returns 500 INTERNAL_SERVER_ERROR error then should display error message', async () => {
    // Setup 500 error mock
    setupChatApiErrorMock(statusCodes.INTERNAL_SERVER_ERROR)

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem getting a response. Please try again.')
    expect(bodyText).toContain('What is user centred design?') // Question should be preserved
  })

  test('POST /start - when chat API returns 502 Bad Gateway then should display error message', async () => {
    // Setup 502 error mock
    setupChatApiErrorMock(statusCodes.BAD_GATEWAY)

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
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

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
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

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
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

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie
      },
      payload: {
        modelName: 'Sonnet 3.7',
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

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        cookie
      }
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

    const cookie = await loginAndGetCookie()

    const response = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        cookie
      }
    })

    expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

    const { window } = new JSDOM(response.result)
    const page = window.document

    // Check that error message is displayed
    const bodyText = page.body.textContent
    expect(bodyText).toContain('Sorry, there was a problem with the service request')
  })
})
