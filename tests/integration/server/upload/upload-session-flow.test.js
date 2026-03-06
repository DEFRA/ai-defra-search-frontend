import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import { vi } from 'vitest'

import { createServer } from '../../../../src/server/server.js'
import { initiateUpload } from '../../../../src/server/services/cdp-uploader-service.js'

vi.mock('../../../../src/server/services/cdp-uploader-service.js')

describe('upload session flow', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(initiateUpload).mockResolvedValue({
      uploadId: 'upload-abc123',
      statusUrl: 'http://cdp/status/upload-abc123',
      uploadReference: 'ref-abc123'
    })
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('session fields are stored and retrievable after initiating an upload', async () => {
    const postResponse = await server.inject({
      method: 'POST',
      url: '/upload',
      payload: { 'knowledge-group': 'group-1' }
    })

    expect(postResponse.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
    const redirectUrl = postResponse.headers.location
    expect(redirectUrl).toBe('/upload/files/ref-abc123')

    const getResponse = await server.inject({
      method: 'GET',
      url: redirectUrl
    })

    expect(getResponse.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(getResponse.result)
    const form = window.document.querySelector('form')
    expect(form.getAttribute('action')).toContain('upload-abc123')
  })
})
