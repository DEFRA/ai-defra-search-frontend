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


//   Happy path: User enters correct password and successfully lands on empty signed-in screen
// Unhappy path: User enters incorrect password and sees an appropriate error message
// Unhappy path: User navigates directly to signed-in screen and is automatically redirected to the password screen
  
  test('When user provides correct password, redirect to empty signed-in screen', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/login'
    })

    expect(statusCode).toBe(statusCodes.PERMANENT_REDIRECT)
    expect(result.location).toBe('/start')
  })

   test('When user provides an incorrect password, return an incorrect password error message', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/login'
    })

    expect(statusCode).toBe(statusCodes.OK)
    const dom = new JSDOM(result.body);
    dom.window.document.querySelectorAll('.govuk-error-summary__list li').

  })


   test('When user navigates to the  signed-in screen (/start), they are redirected to the password screen', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/start'
    })

    expect(statusCode).toBe(statusCodes.PERMANENT_REDIRECT)
    expect(result.location).toBe('/login')
  })
})
