import { vi } from 'vitest'

import { createServer } from '../../../../src/server/server.js'
import { createDocuments } from '../../../../src/server/services/knowledge-groups-service.js'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')

const UPLOAD_REFERENCE = 'test-upload-reference'
const KNOWLEDGE_GROUP_ID = 'group-123'

const completeFile = {
  fileId: 'c17543b8-e440-4156-8df4-af62f40a7ac8',
  filename: 'photo.jpg',
  contentType: 'image/jpeg',
  fileStatus: 'complete',
  contentLength: 5489,
  checksumSha256: 'ZGVqbRa35NmKTXG1GFTpoijQKlneGK2uMR/Tp/VXqQg=',
  detectedContentType: 'image/jpeg',
  s3Key: `uploads/${KNOWLEDGE_GROUP_ID}/c17543b8-e440-4156-8df4-af62f40a7ac8`,
  s3Bucket: 'test-bucket'
}

const rejectedFile = {
  fileId: 'd45e67f8-9a01-2b3c-4d5e-6f7a8b9c0d1e',
  filename: 'bad-file.exe',
  contentType: 'application/octet-stream',
  fileStatus: 'rejected',
  hasError: true,
  errorMessage: 'The selected file contains a virus'
}

function buildPayload (formOverrides = {}) {
  return {
    uploadStatus: 'ready',
    metadata: { knowledgeGroupId: KNOWLEDGE_GROUP_ID, uploadReference: UPLOAD_REFERENCE },
    form: formOverrides,
    numberOfRejectedFiles: 0
  }
}

describe('Upload callback', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(createDocuments).mockClear()
    vi.mocked(createDocuments).mockResolvedValue([])
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('POST /upload/callback/:uploadReference', () => {
    test('returns 200 when payload contains complete files', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/upload/callback/${UPLOAD_REFERENCE}`,
        payload: buildPayload({ file1: completeFile })
      })

      expect(response.statusCode).toBe(200)
    })

    test('calls createDocuments only for complete files, skipping rejected files and text fields', async () => {
      await server.inject({
        method: 'POST',
        url: `/upload/callback/${UPLOAD_REFERENCE}`,
        payload: {
          ...buildPayload({
            file1: completeFile,
            file2: rejectedFile,
            someTextField: 'a text value'
          }),
          numberOfRejectedFiles: 1
        }
      })

      expect(createDocuments).toHaveBeenCalledWith([
        {
          file_name: completeFile.filename,
          knowledge_group_id: KNOWLEDGE_GROUP_ID,
          cdp_upload_id: UPLOAD_REFERENCE,
          status: 'uploaded',
          s3_key: completeFile.s3Key
        }
      ])
    })

    test('returns 200 when all files are rejected and does not call createDocuments', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/upload/callback/${UPLOAD_REFERENCE}`,
        payload: {
          ...buildPayload({ file1: rejectedFile }),
          numberOfRejectedFiles: 1
        }
      })

      expect(response.statusCode).toBe(200)
      expect(createDocuments).not.toHaveBeenCalled()
    })

    test('returns 200 even when createDocuments throws', async () => {
      vi.mocked(createDocuments).mockRejectedValue(new Error('Knowledge service unavailable'))

      const response = await server.inject({
        method: 'POST',
        url: `/upload/callback/${UPLOAD_REFERENCE}`,
        payload: buildPayload({ file1: completeFile })
      })

      expect(response.statusCode).toBe(200)
    })
  })
})
