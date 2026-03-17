import { describe, test, expect, beforeEach, vi } from 'vitest'
import statusCodes from 'http-status-codes'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')
vi.mock('../../../../src/server/services/cdp-uploader-service.js')
vi.mock('../../../../src/server/upload/upload-session-cache.js')
vi.mock('../../../../src/server/common/helpers/audit.js', () => ({
  auditKnowledgeGroupFileUpload: vi.fn()
}))
vi.mock('../../../../src/server/common/helpers/user-context.js', () => ({
  getUserId: vi.fn().mockReturnValue('user-123'),
  getSessionId: vi.fn().mockReturnValue('session-abc')
}))
vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() })
}))

const knowledgeGroupsService = await import('../../../../src/server/services/knowledge-groups-service.js')
const cdpUploaderService = await import('../../../../src/server/services/cdp-uploader-service.js')
const uploadSessionCache = await import('../../../../src/server/upload/upload-session-cache.js')
const { auditKnowledgeGroupFileUpload } = await import('../../../../src/server/common/helpers/audit.js')
const {
  uploadGetController,
  uploadPostController,
  uploadCallbackController,
  uploadFileGetController,
  uploadStatusGetController,
  uploadCreateGroupGetController,
  uploadCreateGroupPostController
} = await import('../../../../src/server/upload/controller.js')

describe('upload controller', () => {
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()
    mockH = {
      view: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      response: vi.fn().mockReturnThis()
    }
  })

  describe('uploadGetController', () => {
    test('renders upload view with knowledge group select items', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'Group 1' },
        { id: 'g2', name: 'Group 2' }
      ])

      await uploadGetController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          knowledgeGroupSelectItems: [
            { value: '', text: 'Select a group' },
            { value: 'g1', text: 'Group 1' },
            { value: 'g2', text: 'Group 2' }
          ]
        })
      )
    })

    test('renders with empty select when listKnowledgeGroups returns []', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([])

      await uploadGetController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          knowledgeGroupSelectItems: [{ value: '', text: 'Select a group' }]
        })
      )
    })

    test('renders with empty select when listKnowledgeGroups fails', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockRejectedValue(new Error('API down'))

      await uploadGetController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          knowledgeGroupSelectItems: [{ value: '', text: 'Select a group' }]
        })
      )
    })

    test('renders with empty select when listKnowledgeGroups returns null', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue(null)

      await uploadGetController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          knowledgeGroupSelectItems: [{ value: '', text: 'Select a group' }]
        })
      )
    })
  })

  describe('uploadPostController', () => {
    test('returns 400 when knowledge-group is empty', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([])

      await uploadPostController.handler(
        { payload: { 'knowledge-group': '' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          errorMessage: 'Select a knowledge group',
          selectedKnowledgeGroup: ''
        })
      )
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
    })

    test('returns 400 when knowledge-group is whitespace only', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([])

      await uploadPostController.handler(
        { payload: { 'knowledge-group': '   ' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          errorMessage: 'Select a knowledge group'
        })
      )
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
    })

    test('returns 400 when payload is missing', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([])

      await uploadPostController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          errorMessage: 'Select a knowledge group',
          selectedKnowledgeGroup: ''
        })
      )
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
    })

    test('returns 400 when knowledge-group key is missing from payload', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([])

      await uploadPostController.handler({ payload: {} }, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          errorMessage: 'Select a knowledge group',
          selectedKnowledgeGroup: ''
        })
      )
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
    })

    test('calls initiateUpload with knowledgeGroupId', async () => {
      cdpUploaderService.initiateUpload.mockResolvedValue({
        uploadId: 'abc123',
        uploadUrl: '/upload-and-scan/abc123',
        statusUrl: '/status/abc123',
        uploadReference: 'ref-abc123'
      })
      uploadSessionCache.storeUploadSession.mockResolvedValue(undefined)

      await uploadPostController.handler(
        { payload: { 'knowledge-group': 'g1' } },
        mockH
      )

      expect(cdpUploaderService.initiateUpload).toHaveBeenCalledWith({ knowledgeGroupId: 'g1' })
    })

    test('stores userId and sessionId in the upload session', async () => {
      cdpUploaderService.initiateUpload.mockResolvedValue({
        uploadId: 'abc123',
        uploadUrl: '/upload-and-scan/abc123',
        statusUrl: '/status/abc123',
        uploadReference: 'ref-abc123'
      })
      uploadSessionCache.storeUploadSession.mockResolvedValue(undefined)

      await uploadPostController.handler(
        { payload: { 'knowledge-group': 'g1' } },
        mockH
      )

      expect(uploadSessionCache.storeUploadSession).toHaveBeenCalledWith(
        'ref-abc123',
        expect.objectContaining({ userId: 'user-123', sessionId: 'session-abc' })
      )
    })

    test('redirects to /upload/files/{uploadReference} on initiate success', async () => {
      cdpUploaderService.initiateUpload.mockResolvedValue({
        uploadId: 'abc123',
        uploadUrl: '/upload-and-scan/abc123',
        statusUrl: '/status/abc123',
        uploadReference: 'ref-abc123'
      })
      uploadSessionCache.storeUploadSession.mockResolvedValue(undefined)

      await uploadPostController.handler(
        { payload: { 'knowledge-group': 'g1' } },
        mockH
      )

      expect(mockH.redirect).toHaveBeenCalledWith('/upload/files/ref-abc123')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    test('re-renders upload/upload with 500 when initiateUpload throws', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([])
      cdpUploaderService.initiateUpload.mockRejectedValue(new Error('CDP unavailable'))

      await uploadPostController.handler(
        { payload: { 'knowledge-group': 'g1' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          errorMessage: 'Failed to start upload. Please try again.'
        })
      )
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.INTERNAL_SERVER_ERROR)
    })
  })

  describe('uploadCallbackController', () => {
    const uploadReference = 'upload-ref-123'
    const knowledgeGroupId = 'group-abc'

    const makeRequest = (formFiles, fileStatus = 'complete') => ({
      params: { uploadReference },
      payload: {
        metadata: { knowledgeGroupId },
        form: {
          file: formFiles.map((fileSpec, i) => {
            const filename = typeof fileSpec === 'string' ? fileSpec : fileSpec.filename
            const status = typeof fileSpec === 'string' ? fileStatus : (fileSpec.fileStatus ?? fileStatus)
            return {
              fileId: `file-id-${i}`,
              filename,
              fileStatus: status,
              size: 1234,
              s3Key: `uploads/${knowledgeGroupId}/${filename}`,
              s3Bucket: 'my-bucket'
            }
          })
        }
      }
    })

    beforeEach(() => {
      mockH.response = vi.fn().mockReturnThis()
      uploadSessionCache.getUploadSession.mockResolvedValue({
        uploadId: 'upload-id-123',
        statusUrl: '/status/upload-ref-123',
        knowledgeGroupId,
        userId: 'user-123',
        sessionId: 'session-abc'
      })
    })

    test('creates documents for each complete file mapped with metadata from the callback payload', async () => {
      knowledgeGroupsService.createDocuments.mockResolvedValue()

      await uploadCallbackController.handler(makeRequest(['report.pdf', 'notes.txt']), mockH)

      expect(knowledgeGroupsService.createDocuments).toHaveBeenCalledWith([
        {
          file_name: 'report.pdf',
          knowledge_group_id: knowledgeGroupId,
          cdp_upload_id: uploadReference,
          status: 'uploaded',
          s3_key: `uploads/${knowledgeGroupId}/report.pdf`
        },
        {
          file_name: 'notes.txt',
          knowledge_group_id: knowledgeGroupId,
          cdp_upload_id: uploadReference,
          status: 'uploaded',
          s3_key: `uploads/${knowledgeGroupId}/notes.txt`
        }
      ])
    })

    test('creates documents only for complete files when the payload contains a mix of complete and rejected files', async () => {
      knowledgeGroupsService.createDocuments.mockResolvedValue()

      const request = makeRequest([
        { filename: 'good.pdf', fileStatus: 'complete' },
        { filename: 'virus.exe', fileStatus: 'rejected' }
      ])

      await uploadCallbackController.handler(request, mockH)

      expect(knowledgeGroupsService.createDocuments).toHaveBeenCalledWith([
        expect.objectContaining({ file_name: 'good.pdf' })
      ])
    })

    test('does not call createDocuments when no files are complete', async () => {
      await uploadCallbackController.handler(makeRequest(['malware.exe'], 'rejected'), mockH)

      expect(knowledgeGroupsService.createDocuments).not.toHaveBeenCalled()
    })

    test('returns 200 OK regardless of file status', async () => {
      knowledgeGroupsService.createDocuments.mockResolvedValue()

      await uploadCallbackController.handler(makeRequest(['report.pdf']), mockH)

      expect(mockH.response).toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    test('returns 200 OK when createDocuments throws', async () => {
      knowledgeGroupsService.createDocuments.mockRejectedValue(new Error('knowledge service unavailable'))

      await uploadCallbackController.handler(makeRequest(['report.pdf']), mockH)

      expect(mockH.response).toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    test('audits each complete and rejected file individually', async () => {
      knowledgeGroupsService.createDocuments.mockResolvedValue()

      const request = makeRequest([
        { filename: 'good.pdf', fileStatus: 'complete' },
        { filename: 'virus.exe', fileStatus: 'rejected' }
      ])

      await uploadCallbackController.handler(request, mockH)

      expect(auditKnowledgeGroupFileUpload).toHaveBeenCalledTimes(2)
      expect(auditKnowledgeGroupFileUpload).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: 'session-abc',
        knowledgeGroupId,
        fileName: 'good.pdf',
        fileSize: 1234,
        uploadStatus: 'complete'
      })
      expect(auditKnowledgeGroupFileUpload).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: 'session-abc',
        knowledgeGroupId,
        fileName: 'virus.exe',
        fileSize: 1234,
        uploadStatus: 'rejected'
      })
    })
  })

  describe('uploadFileGetController', () => {
    test('renders file upload form pointing to the CDP scan URL with supported file types', async () => {
      uploadSessionCache.getUploadSession.mockResolvedValue({
        uploadId: 'abc123',
        statusUrl: '/status/abc123',
        knowledgeGroupId: 'group-1'
      })
      knowledgeGroupsService.getSupportedFileTypes.mockResolvedValue(['docx', 'jsonl', 'pdf', 'pptx'])

      await uploadFileGetController.handler(
        { params: { uploadReference: 'ref-abc123' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/file-upload',
        {
          uploadUrl: '/upload-and-scan/abc123',
          uploadStatusUrl: '/upload-status/ref-abc123',
          supportedFormatsText: 'DOCX, JSONL, PDF, PPTX'
        }
      )
    })

    test('returns 404 when session not found', async () => {
      uploadSessionCache.getUploadSession.mockResolvedValue(null)

      await uploadFileGetController.handler(
        { params: { uploadReference: 'unknown-ref' } },
        mockH
      )

      expect(mockH.response).toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.NOT_FOUND)
    })
  })

  describe('uploadStatusGetController', () => {
    test('returns 404 when session not found', async () => {
      uploadSessionCache.getUploadSession.mockResolvedValue(null)

      await uploadStatusGetController.handler(
        { params: { uploadReference: 'unknown-ref' } },
        mockH
      )

      expect(mockH.response).toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.NOT_FOUND)
    })

    test('renders status view with error banner when fetchUploadStatus throws', async () => {
      uploadSessionCache.getUploadSession.mockResolvedValue({
        uploadId: 'abc123',
        statusUrl: 'http://cdp/status/abc123',
        knowledgeGroupId: 'group-1'
      })
      cdpUploaderService.fetchUploadStatus.mockRejectedValue(new Error('CDP unavailable'))

      await uploadStatusGetController.handler(
        { params: { uploadReference: 'ref-abc123' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload-status',
        expect.objectContaining({
          errorMessage: 'Unable to retrieve upload status. Please try again.'
        })
      )
    })
  })

  describe('uploadCreateGroupGetController', () => {
    test('renders create group form', async () => {
      await uploadCreateGroupGetController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: null,
        values: null
      })
    })
  })

  describe('uploadCreateGroupPostController', () => {
    test('returns 400 when payload is missing', async () => {
      await uploadCreateGroupPostController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: 'Enter a name for the knowledge group',
        values: { name: '', description: '', 'information-asset-owner': '' }
      })
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
      expect(knowledgeGroupsService.createKnowledgeGroup).not.toHaveBeenCalled()
    })

    test('returns 400 when name is empty', async () => {
      await uploadCreateGroupPostController.handler(
        { payload: { name: '', description: 'Desc' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: 'Enter a name for the knowledge group',
        values: { name: '', description: 'Desc', 'information-asset-owner': '' }
      })
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
      expect(knowledgeGroupsService.createKnowledgeGroup).not.toHaveBeenCalled()
    })

    test('returns 400 when name is whitespace only', async () => {
      await uploadCreateGroupPostController.handler(
        { payload: { name: '   ', description: '' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: 'Enter a name for the knowledge group',
        values: { name: '', description: '', 'information-asset-owner': '' }
      })
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
      expect(knowledgeGroupsService.createKnowledgeGroup).not.toHaveBeenCalled()
    })

    test('creates group and redirects on success', async () => {
      knowledgeGroupsService.createKnowledgeGroup.mockResolvedValue({
        id: 'new-id',
        name: 'My Group',
        description: 'A desc'
      })

      await uploadCreateGroupPostController.handler(
        {
          payload: { name: 'My Group', description: 'A desc' }
        },
        mockH
      )

      expect(knowledgeGroupsService.createKnowledgeGroup).toHaveBeenCalledWith(
        { name: 'My Group', description: 'A desc', informationAssetOwner: null }
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/upload')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    test('passes information asset owner when provided', async () => {
      knowledgeGroupsService.createKnowledgeGroup.mockResolvedValue({ id: 'new-id' })

      await uploadCreateGroupPostController.handler(
        {
          payload: {
            name: 'My Group',
            description: '',
            'information-asset-owner': 'Jane Smith'
          }
        },
        mockH
      )

      expect(knowledgeGroupsService.createKnowledgeGroup).toHaveBeenCalledWith({
        name: 'My Group',
        description: null,
        informationAssetOwner: 'Jane Smith'
      })
    })

    test('shows err.detail when create fails with string detail', async () => {
      const err = new Error('API error')
      err.detail = 'Group name already exists'
      err.status = 400
      knowledgeGroupsService.createKnowledgeGroup.mockRejectedValue(err)

      await uploadCreateGroupPostController.handler(
        { payload: { name: 'Dup', description: '' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: 'Group name already exists',
        values: { name: 'Dup', description: '', 'information-asset-owner': '' }
      })
      expect(mockH.code).toHaveBeenCalledWith(400)
    })

    test('shows generic message when create fails with non-string detail', async () => {
      const err = new Error('API error')
      err.detail = { code: 'ERR' }
      err.status = 500
      knowledgeGroupsService.createKnowledgeGroup.mockRejectedValue(err)

      await uploadCreateGroupPostController.handler(
        { payload: { name: 'Test', description: '' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: 'Failed to create knowledge group',
        values: { name: 'Test', description: '', 'information-asset-owner': '' }
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    test('uses 500 when err.status is missing', async () => {
      const err = new Error('Network error')
      knowledgeGroupsService.createKnowledgeGroup.mockRejectedValue(err)

      await uploadCreateGroupPostController.handler(
        { payload: { name: 'Test', description: '' } },
        mockH
      )

      expect(mockH.code).toHaveBeenCalledWith(statusCodes.INTERNAL_SERVER_ERROR)
    })
  })
})
