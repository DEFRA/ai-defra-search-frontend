import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'


describe('Login routes', () => {
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
  })

  test('GET /login should return the login page', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/login'
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    expect(page.title).toBe('AI Assistant')

    const form = page.querySelector('form[action="/login"]')
    expect(form).not.toBeNull()

    const passwordInput = form.querySelector('input[name="password"]')

    expect(passwordInput).not.toBeNull()
    expect(passwordInput.type).toBe('password')
  })

  test('POST /login with correct password should redirect to signed-in screen', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/start')
  })

  test('POST /login with incorrect password should return an error page', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'incorrectpassword'
      }
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    expect(page.title).toBe('AI Assistant')

    const errorSummary = page.querySelector('.govuk-error-summary')
    expect(errorSummary).not.toBeNull()
  })

  test('GET /start when not authenticated should redirect to login', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/start'
    })

    expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/login')
  })
})
