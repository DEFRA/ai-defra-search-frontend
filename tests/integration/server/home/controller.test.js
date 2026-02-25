import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'

describe('Homepage (GET /)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('when an authenticated user navigates to the root URL', () => {
    test('displays the homepage and content', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const bodyText = page.body.textContent
      expect(bodyText).toContain('This AI Assistant is a test environment')
      expect(bodyText).toContain('Do not enter sensitive or personal data')

      const startChatLink = page.querySelector('a[href="/start"]')
      expect(startChatLink).not.toBeNull()
      expect(startChatLink.textContent).toContain('Start Chat')
    })
  })
})
