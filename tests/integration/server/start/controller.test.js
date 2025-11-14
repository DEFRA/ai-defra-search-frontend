import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'
import { setupChatApiMocks, cleanupChatApiMocks, setupChatApiErrorMock } from '../../../mocks/chat-api-handlers.js'

describe('Start routes', () => {
  let server

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
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const startResponse = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      }
    })

    expect(startResponse.statusCode).toBe(statusCodes.OK)
  })

  test('POST /start with question should return page with response', async () => {
    setupChatApiMocks()

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const questionResponse = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
        question: 'What is user centred design?'
      }
    })

    expect(questionResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(questionResponse.result)
    const page = window.document

    // Check the page contains the question and response from mock API
    const bodyText = page.body.textContent

    expect(bodyText).toContain('You asked:')
    expect(bodyText).toContain('What is UCD?')
    expect(bodyText).toContain('UCD Bot')
    expect(bodyText).toContain('User-Centred Design (UCD)')
  })

  test('POST /start when not authenticated should redirect to login', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/start',
      payload: {
        question: 'What is user centred design?'
      }
    })

    expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/login')
  })

  test('POST /start - when question not in request then should display validation error', async () => {
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
      }
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('POST /start - when question length too short then should display validation error', async () => {
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
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
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
        question: 'f'.repeat(501)
      }
    })

    expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

    const { window } = new JSDOM(response.result)
    const page = window.document

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('POST /start - when chat API returns 500 error then should display error message', async () => {
    // Setup 500 error mock
    setupChatApiErrorMock(500)

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
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
    setupChatApiErrorMock(502)

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
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
    setupChatApiErrorMock(503)

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
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
    setupChatApiErrorMock(504)

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
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

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    const cookie = loginResponse.headers['set-cookie']

    const response = await server.inject({
      method: 'POST',
      url: '/start',
      headers: {
        cookie: cookie.join(';')
      },
      payload: {
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
})
