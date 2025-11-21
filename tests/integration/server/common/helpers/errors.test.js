import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../../src/server/server.js'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    const window = new JSDOM(result).window
    const { document } = window

    expect(document.querySelector('p').textContent).toEqual('Page not found')
    expect(statusCode).toBe(statusCodes.NOT_FOUND)
  })
})
