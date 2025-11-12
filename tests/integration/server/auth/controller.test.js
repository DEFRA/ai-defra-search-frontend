import statusCodes from 'http-status-codes'
import {JSDOM} from 'jsdom'
import { createServer } from '../../../../src/server/server.js'


describe('Authentication routes controller', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /login should return the login page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/login'
    })

    const { window } = new JSDOM(result.body)
    const page = window.document

    expect(page.title).toBe('UCD chatbot for Defra')

    const form = page.querySelector('form[action="/login"]')
    expect(form).not.toBeNull()

    const passwordInput = form.querySelector('input[name="password"]')

    expect(passwordInput).not.toBeNull()
    expect(passwordInput.type).toBe('hidden')
  })

  test('POST /login with correct credentials should redirect to signed-in screen', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'correctpassword'
      }
    })

    expect(statusCode).toBe(statusCodes.PERMANENT_REDIRECT)
    expect(result.location).toBe('/start')
  })

  test('POST /login with incorrect password should return an error page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        password: 'incorrectpassword'
      }
    })

    expect(statusCode).toBe(statusCodes.OK)

    const { document: page } = (new JSDOM(result.body)).window

    const errorSummary = page.querySelector('.govuk-error-summary')

    expect(page.title).toBe('UCD chatbot for Defra')
    expect(errorSummary).not.toBeNull()
  })


  test('POST /start when not authenticated should redirect to login', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/start'
    })

    expect(statusCode).toBe(statusCodes.PERMANENT_REDIRECT)
    expect(result.location).toBe('/login')
  })
})
