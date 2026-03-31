import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'

describe('Accessibility statement (GET /accessibility)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('when a user navigates to the accessibility statement', () => {
    test('returns 200 and renders the accessibility statement page', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/accessibility'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Accessibility statement for the Defra AI Assistant')
    })

    test('displays the known accessibility issues', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/accessibility'
      })

      const { window } = new JSDOM(response.result)
      const bodyText = window.document.body.textContent

      expect(bodyText).toContain('How accessible this website is')
      expect(bodyText).toContain('full page reload')
      expect(bodyText).toContain('refresh button')
    })

    test('displays the feedback and contact information', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/accessibility'
      })

      const { window } = new JSDOM(response.result)
      const page = window.document

      const feedbackLink = page.querySelector('a[href="/feedback"]')
      expect(feedbackLink).not.toBeNull()

      const bodyText = page.body.textContent
      expect(bodyText).toContain('#ask-ace')
    })
  })
})
