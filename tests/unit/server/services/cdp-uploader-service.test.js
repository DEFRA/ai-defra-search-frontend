import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'

import { config } from '../../../../src/config/config.js'
import { initiateUpload } from '../../../../src/server/services/cdp-uploader-service.js'

describe('cdp-uploader-service', () => {
  const cdpUploaderUrl = config.get('cdpUploaderUrl')

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('initiateUpload', () => {
    test('POSTs to /initiate with correct body and returns result', async () => {
      nock(cdpUploaderUrl)
        .post('/initiate', {
          redirect: '/',
          s3Bucket: 'test-bucket',
          s3Path: 'uploads/group-1',
          metadata: { knowledgeGroupId: 'group-1' }
        })
        .reply(200, { uploadId: 'abc123', uploadUrl: '/upload-and-scan/abc123', statusUrl: '/status/abc123' })

      const result = await initiateUpload({ knowledgeGroupId: 'group-1' })

      expect(result).toEqual({
        uploadId: 'abc123',
        uploadUrl: '/upload-and-scan/abc123',
        statusUrl: '/status/abc123'
      })
    })

    test('throws on non-2xx response', () => {
      nock(cdpUploaderUrl)
        .post('/initiate')
        .reply(500, 'Internal Server Error')

      return expect(initiateUpload({ knowledgeGroupId: 'group-1' })).rejects.toThrow(
        /CDP Uploader initiate failed with status 500/
      )
    })
  })
})
