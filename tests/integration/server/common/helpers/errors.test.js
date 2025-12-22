import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../../src/server/server.js'
import { expect } from 'vitest'

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

    // Select the main content paragraph, not the phase banner
    const mainContent = document.querySelector('.govuk-main-wrapper')
    const paragraph = mainContent?.querySelector('p')
    expect(paragraph?.textContent).toBe('Page not found')
    expect(statusCode).toBe(statusCodes.NOT_FOUND)
  })
})
