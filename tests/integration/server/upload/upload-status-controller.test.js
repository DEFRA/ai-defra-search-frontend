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

describe('GET /upload-status/:uploadReference', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(getUploadSession).mockResolvedValue(SESSION)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function getStatusPage (statusResponse) {
    vi.mocked(fetchUploadStatus).mockResolvedValue(statusResponse)
    const response = await server.inject({
      method: 'GET',
      url: `/upload-status/${UPLOAD_REFERENCE}`
    })
    const { window } = new JSDOM(response.result)
    return { response, document: window.document }
  }

  describe('pending state', () => {
    test('renders file names and statuses when upload is in progress', async () => {
      const { response, document } = await getStatusPage({
        uploadStatus: 'pending',
        form: {
          files: [
            { filename: 'report.pdf', fileStatus: 'scanning' },
            { filename: 'data.csv', fileStatus: 'scanning' }
          ]
        }
      })

      expect(response.statusCode).toBe(statusCodes.OK)
      expect(document.body.textContent).toContain('report.pdf')
      expect(document.body.textContent).toContain('data.csv')
      expect(document.body.textContent).toContain('scanning')
    })
  })

  describe('success state', () => {
    test('renders successfully uploaded file names', async () => {
      const { response, document } = await getStatusPage({
        uploadStatus: 'ready',
        form: {
          files: [
            { filename: 'report.pdf', fileStatus: 'complete' },
            { filename: 'data.csv', fileStatus: 'complete' }
          ]
        }
      })

      expect(response.statusCode).toBe(statusCodes.OK)
      expect(document.body.textContent).toContain('report.pdf')
      expect(document.body.textContent).toContain('data.csv')
    })
  })

  describe('failures state', () => {
    test('renders failed file names, statuses, and error messages alongside successful files', async () => {
      const { response, document } = await getStatusPage({
        uploadStatus: 'ready',
        form: {
          files: [
            { filename: 'report.pdf', fileStatus: 'complete' },
            { filename: 'malware.exe', fileStatus: 'rejected', errorMessage: 'File contains a virus' }
          ]
        }
      })

      expect(response.statusCode).toBe(statusCodes.OK)
      expect(document.body.textContent).toContain('report.pdf')
      expect(document.body.textContent).toContain('malware.exe')
      expect(document.body.textContent).toContain('rejected')
      expect(document.body.textContent).toContain('File contains a virus')
    })

    test('renders em dash for failed files with no error message', async () => {
      const { document } = await getStatusPage({
        uploadStatus: 'ready',
        form: {
          files: [
            { filename: 'report.pdf', fileStatus: 'complete' },
            { filename: 'bad.exe', fileStatus: 'rejected' }
          ]
        }
      })

      expect(document.body.textContent).toContain('—')
    })

    test('uses singular "file" in warning text when exactly one file fails', async () => {
      const { document } = await getStatusPage({
        uploadStatus: 'ready',
        form: {
          files: [
            { filename: 'report.pdf', fileStatus: 'complete' },
            { filename: 'bad.exe', fileStatus: 'rejected', errorMessage: 'Virus detected' }
          ]
        }
      })

      expect(document.body.textContent).toContain('1 file could not be uploaded')
    })

    test('uses plural "files" in warning text when multiple files fail', async () => {
      const { document } = await getStatusPage({
        uploadStatus: 'ready',
        form: {
          files: [
            { filename: 'report.pdf', fileStatus: 'complete' },
            { filename: 'bad1.exe', fileStatus: 'rejected', errorMessage: 'Virus detected' },
            { filename: 'bad2.exe', fileStatus: 'rejected', errorMessage: 'Virus detected' }
          ]
        }
      })

      expect(document.body.textContent).toContain('2 files could not be uploaded')
    })

    test('does not render successful files section when all files failed', async () => {
      const { document } = await getStatusPage({
        uploadStatus: 'ready',
        form: {
          files: [
            { filename: 'bad1.exe', fileStatus: 'rejected', errorMessage: 'Virus detected' },
            { filename: 'bad2.exe', fileStatus: 'rejected', errorMessage: 'Virus detected' }
          ]
        }
      })

      expect(document.body.textContent).not.toContain('Uploaded successfully')
    })
  })
})
