import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'


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
})
