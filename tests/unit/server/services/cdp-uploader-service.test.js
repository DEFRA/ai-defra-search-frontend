import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'

import { config } from '../../../../src/config/config.js'
import { initiateUpload, fetchUploadStatus } from '../../../../src/server/services/cdp-uploader-service.js'

const { MOCK_UPLOAD_REFERENCE } = vi.hoisted(() => ({
  MOCK_UPLOAD_REFERENCE: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
}))

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue(MOCK_UPLOAD_REFERENCE)
}))

describe('cdp-uploader-service', () => {
  const cdpUploaderUrl = config.get('cdpUploaderUrl')
  const cdpUploadCallbackUrl = config.get('cdpUploadCallbackUrl')

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('initiateUpload', () => {
    test('POSTs to /initiate with correct body and returns uploadId and uploadReference', async () => {
      nock(cdpUploaderUrl)
        .post('/initiate', {
          redirect: `/upload-status/${MOCK_UPLOAD_REFERENCE}`,
          callback: `${cdpUploadCallbackUrl}/${MOCK_UPLOAD_REFERENCE}`,
          s3Bucket: 'test-bucket',
          s3Path: 'uploads/group-1',
          metadata: { knowledgeGroupId: 'group-1', uploadReference: MOCK_UPLOAD_REFERENCE }
        })
        .reply(200, { uploadId: 'abc123', uploadUrl: '/upload-and-scan/abc123', statusUrl: '/status/abc123' })

      const result = await initiateUpload({ knowledgeGroupId: 'group-1' })

      expect(result).toEqual({
        uploadId: 'abc123',
        uploadUrl: '/upload-and-scan/abc123',
        statusUrl: `${cdpUploaderUrl}/status/abc123`,
        uploadReference: MOCK_UPLOAD_REFERENCE
      })
    })

    test('throws on non-2xx response', () => {
      nock(cdpUploaderUrl)
        .post('/initiate')
        .reply(500, 'Internal Server Error')

      return expect(initiateUpload({ knowledgeGroupId: 'group-1' })).rejects.toThrow(
        /CDP upload initiate failed with status 500/
      )
    })

    test('throws when the HTTP request fails with a network error', () => {
      nock(cdpUploaderUrl)
        .post('/initiate')
        .replyWithError('ECONNREFUSED')

      return expect(initiateUpload({ knowledgeGroupId: 'group-1' })).rejects.toThrow('ECONNREFUSED')
    })
  })

  describe('fetchUploadStatus', () => {
    test('returns parsed status data', async () => {
      const statusData = {
        uploadStatus: 'ready',
        form: {
          'file-0': { fileId: 'f1', filename: 'doc.pdf', fileStatus: 'complete' }
        }
      }

      nock(cdpUploaderUrl)
        .get('/status/abc123')
        .reply(200, statusData)

      const result = await fetchUploadStatus(`${cdpUploaderUrl}/status/abc123`)

      expect(result).toEqual(statusData)
    })

    test('throws on non-2xx', () => {
      nock(cdpUploaderUrl)
        .get('/status/abc123')
        .reply(503)

      return expect(fetchUploadStatus(`${cdpUploaderUrl}/status/abc123`)).rejects.toThrow(/503/)
    })
  })
})
