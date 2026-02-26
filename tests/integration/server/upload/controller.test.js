import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'

describe('Upload page (GET /upload)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('displays the upload page with file input and upload button', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/upload'
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    expect(page.body.textContent).toContain('Upload')
    expect(page.body.textContent).toContain('Knowledge group')
    expect(page.querySelector('select#knowledge-group')).not.toBeNull()
    expect(page.body.textContent).toContain('Choose a file')
    expect(page.querySelector('input[type="file"]')).not.toBeNull()
    expect(page.querySelector('button[type="submit"]')).not.toBeNull()
  })

  test('shows error banner when submitting without selecting a knowledge group', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/upload',
      payload: { 'knowledge-group': '' }
    })

    expect(response.statusCode).toBe(400)

    const { window } = new JSDOM(response.result)
    const page = window.document

    expect(page.body.textContent).toContain('There is a problem')
    expect(page.body.textContent).toContain('Select a knowledge group')
    expect(page.querySelector('a[href="#knowledge-group"]')).not.toBeNull()
  })

  test('accepts valid submission with knowledge group selected', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/upload',
      payload: { 'knowledge-group': 'some-group-id' }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).not.toContain('There is a problem')
  })
})
