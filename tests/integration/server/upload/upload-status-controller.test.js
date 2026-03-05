import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import { vi } from 'vitest'

import { createServer } from '../../../../src/server/server.js'
import { getUploadSession } from '../../../../src/server/upload/upload-session-cache.js'
import { fetchUploadStatus } from '../../../../src/server/services/cdp-uploader-service.js'

vi.mock('../../../../src/server/upload/upload-session-cache.js')
vi.mock('../../../../src/server/services/cdp-uploader-service.js')

const UPLOAD_REFERENCE = 'test-upload-ref'

const SESSION = {
  uploadId: 'test-upload-id',
  statusUrl: 'http://cdp/status/test-upload-id',
  knowledgeGroupId: 'group-1'
}

const STATUS_RESPONSE = {
  uploadStatus: 'ready',
  form: {
    file: [
      { fileId: 'file-id-1', filename: 'report.pdf', fileStatus: 'complete' },
      { fileId: 'file-id-2', filename: 'data.csv', fileStatus: 'complete' }
    ]
  }
}

describe('GET /upload-status/:uploadReference', () => {
  let server

  beforeAll(async () => {
    vi.mocked(getUploadSession).mockResolvedValue(SESSION)
    vi.mocked(fetchUploadStatus).mockResolvedValue(STATUS_RESPONSE)
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(getUploadSession).mockResolvedValue(SESSION)
    vi.mocked(fetchUploadStatus).mockResolvedValue(STATUS_RESPONSE)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('renders status page with upload status and file table', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/upload-status/${UPLOAD_REFERENCE}`
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document

    expect(page.body.textContent).toContain('Upload status')
    expect(page.body.textContent).toContain('ready')
    expect(page.body.textContent).toContain('report.pdf')
    expect(page.body.textContent).toContain('file-id-1')
    expect(page.body.textContent).toContain('data.csv')
    expect(page.body.textContent).toContain('file-id-2')
  })

  test('returns 404 when session not found', async () => {
    vi.mocked(getUploadSession).mockResolvedValue(null)

    const response = await server.inject({
      method: 'GET',
      url: `/upload-status/${UPLOAD_REFERENCE}`
    })

    expect(response.statusCode).toBe(statusCodes.NOT_FOUND)
  })

  test('shows error banner when status fetch fails', async () => {
    vi.mocked(fetchUploadStatus).mockRejectedValue(new Error('CDP unavailable'))

    const response = await server.inject({
      method: 'GET',
      url: `/upload-status/${UPLOAD_REFERENCE}`
    })

    expect(response.statusCode).toBe(statusCodes.OK)

    const { window } = new JSDOM(response.result)
    const page = window.document
    expect(page.body.textContent).toContain('There is a problem')
    expect(page.body.textContent).toContain('Unable to retrieve upload status')
  })
})
