import { describe, test, expect, beforeEach, vi } from 'vitest'
import statusCodes from 'http-status-codes'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')
vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() })
}))

const knowledgeGroupsApi = await import('../../../../src/server/services/knowledge-groups-service.js')
const {
  knowledgeListController,
  knowledgeGroupController,
  knowledgeAddGroupGetController,
  knowledgeAddGroupPostController
} = await import('../../../../src/server/knowledge/controller.js')

describe('knowledge controller', () => {
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()
    mockH = {
      view: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis()
    }
  })

  describe('knowledgeListController', () => {
    test('should render list with groups and document count', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'G1', description: 'Desc', information_asset_owner: 'Owner' }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue([
        { id: 'd1', file_name: 'a.pdf' },
        { id: 'd2', file_name: 'b.pdf' }
      ])

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', {
        pageTitle: 'Knowledge Management',
        groups: [{
          groupId: 'g1',
          title: 'G1',
          description: 'Desc',
          owner: 'Owner',
          sourceCount: 2
        }],
        errorMessage: null
      })
    })

    test('should handle non-array response', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue(null)

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', expect.objectContaining({
        groups: [],
        errorMessage: null
      }))
    })

    test('should render error view on API failure', async () => {
      const err = new Error('API failed')
      err.detail = 'Detail message'
      err.status = 503
      knowledgeGroupsApi.listKnowledgeGroups.mockRejectedValue(err)

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', {
        pageTitle: 'Knowledge Management',
        groups: [],
        errorMessage: 'Detail message'
      })
      expect(mockH.code).toHaveBeenCalledWith(503)
    })

    test('should use err.message when err.detail is missing', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockRejectedValue(new Error('Network error'))

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', expect.objectContaining({
        errorMessage: 'Network error'
      }))
    })

    test('should use 0 when listDocumentsByKnowledgeGroup fails for a group', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'G1', description: null, information_asset_owner: null }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockRejectedValue(new Error('API error'))

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', expect.objectContaining({
        groups: [expect.objectContaining({ groupId: 'g1', sourceCount: 0 })]
      }))
    })

    test('should use 0 when listDocumentsByKnowledgeGroup returns non-array', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'G1', description: null, information_asset_owner: null }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue(null)

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', expect.objectContaining({
        groups: [expect.objectContaining({ groupId: 'g1', sourceCount: 0 })]
      }))
    })
  })

  describe('knowledgeGroupController', () => {
    test('should render group with documents inline', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'My Group', description: 'Desc', information_asset_owner: 'Owner' }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue([
        { id: 'd1', file_name: 'doc.pdf', status: 'ready', chunk_count: 10, cdp_upload_id: 'up-1', created_at: '2025-03-05T12:00:00Z' }
      ])

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'My Group – Knowledge',
        group: { groupId: 'g1', title: 'My Group', description: 'Desc', owner: 'Owner' },
        documents: expect.any(Array),
        errorMessage: null
      }))
      expect(knowledgeGroupsApi.listDocumentsByKnowledgeGroup).toHaveBeenCalledWith('g1')
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.documents).toHaveLength(1)
      expect(viewArgs.documents[0]).toMatchObject({
        file_name: 'doc.pdf',
        status: 'ready',
        chunk_count: 10,
        cdp_upload_id: 'up-1'
      })
      expect(viewArgs.documents[0].created_at_display).toBeTruthy()
    })

    test('should render group with empty documents', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'My Group', description: 'Desc', information_asset_owner: 'Owner' }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue([])

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'My Group – Knowledge',
        group: { groupId: 'g1', title: 'My Group', description: 'Desc', owner: 'Owner' },
        documents: [],
        errorMessage: null
      }))
    })

    test('should render 404 when group not found', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'other', name: 'Other', description: null, information_asset_owner: null }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue([])

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'Knowledge Group – Error',
        errorMessage: 'Knowledge group not found',
        documents: []
      }))
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    test('should render 404 when listKnowledgeGroups returns non-array', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue(null)
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue([])

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'Knowledge Group – Error',
        errorMessage: 'Knowledge group not found',
        documents: []
      }))
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    test('should render error view on failure', async () => {
      const err = new Error('Not found')
      err.detail = 'Group not found'
      err.status = 404
      knowledgeGroupsApi.listKnowledgeGroups.mockRejectedValue(err)

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'Knowledge Group – Error',
        errorMessage: 'Group not found',
        documents: []
      }))
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    test('should use 500 when err.status is undefined', async () => {
      const err = new Error('Unexpected')
      err.detail = 'Server error'
      knowledgeGroupsApi.listKnowledgeGroups.mockRejectedValue(err)

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.code).toHaveBeenCalledWith(statusCodes.INTERNAL_SERVER_ERROR)
    })

    test('should render documents with null created_at_display when created_at missing', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'My Group', description: null, information_asset_owner: null }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue([
        { id: 'd1', file_name: 'doc.pdf', status: 'ready', created_at: null }
      ])

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.documents[0].created_at_display).toBeNull()
    })

    test('should handle non-array documents response', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'My Group', description: null, information_asset_owner: null }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockResolvedValue(null)

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        documents: [],
        errorMessage: null
      }))
    })

    test('should render error view on listDocumentsByKnowledgeGroup failure', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'My Group', description: null, information_asset_owner: null }
      ])
      const err = new Error('API error')
      err.status = 500
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockRejectedValue(err)

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'Knowledge Group – Error',
        documents: [],
        errorMessage: 'API error'
      }))
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    test('should use 500 when listDocumentsByKnowledgeGroup fails without err.status', async () => {
      knowledgeGroupsApi.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'My Group', description: null, information_asset_owner: null }
      ])
      knowledgeGroupsApi.listDocumentsByKnowledgeGroup.mockRejectedValue(new Error('Network error'))

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.code).toHaveBeenCalledWith(statusCodes.INTERNAL_SERVER_ERROR)
    })
  })

  describe('knowledgeAddGroupGetController', () => {
    test('should render add form', async () => {
      await knowledgeAddGroupGetController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/add-group', {
        pageTitle: 'Add knowledge group',
        errorMessage: null,
        values: null
      })
    })
  })

  describe('knowledgeAddGroupPostController', () => {
    test('should create group and redirect', async () => {
      knowledgeGroupsApi.createKnowledgeGroup.mockResolvedValue()

      const request = {
        payload: {
          name: 'Test',
          description: 'Desc',
          'information-asset-owner': 'Owner'
        }
      }
      await knowledgeAddGroupPostController.handler(request, mockH)

      expect(knowledgeGroupsApi.createKnowledgeGroup).toHaveBeenCalledWith({
        name: 'Test',
        description: 'Desc',
        informationAssetOwner: 'Owner'
      })
      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge')
    })

    test('should pass null for optional fields', async () => {
      knowledgeGroupsApi.createKnowledgeGroup.mockResolvedValue()

      const request = {
        payload: { name: 'Test', description: '', 'information-asset-owner': '' }
      }
      await knowledgeAddGroupPostController.handler(request, mockH)

      expect(knowledgeGroupsApi.createKnowledgeGroup).toHaveBeenCalledWith({
        name: 'Test',
        description: null,
        informationAssetOwner: null
      })
    })

    test('should render error view on create failure', async () => {
      knowledgeGroupsApi.createKnowledgeGroup.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'API error', status: 500 }))

      const request = {
        payload: { name: 'T', description: 'D', 'information-asset-owner': 'o' }
      }
      await knowledgeAddGroupPostController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/add-group', {
        pageTitle: 'Add knowledge group',
        errorMessage: 'API error',
        values: request.payload
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    test('should use 500 when create fails without err.status', async () => {
      knowledgeGroupsApi.createKnowledgeGroup.mockRejectedValue(new Error('Unexpected'))

      const request = { payload: { name: 'T', description: '', 'information-asset-owner': '' } }
      await knowledgeAddGroupPostController.handler(request, mockH)

      expect(mockH.code).toHaveBeenCalledWith(statusCodes.INTERNAL_SERVER_ERROR)
    })
  })

  describe('validation', () => {
    test('knowledgeAddGroupPostController failAction returns validation error view', () => {
      const failAction = knowledgeAddGroupPostController.options.validate.failAction
      const req = { payload: {} }
      const h = {
        view: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis(),
        takeover: vi.fn()
      }
      const error = { details: [{ message: 'name is required' }] }

      failAction(req, h, error)

      expect(h.view).toHaveBeenCalledWith('knowledge/add-group', {
        pageTitle: 'Add knowledge group',
        errorMessage: 'name is required',
        values: {}
      })
      expect(h.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
      expect(h.takeover).toHaveBeenCalled()
    })

    test('failAction uses VALIDATION_FAILED_MESSAGE when error.details is missing', () => {
      const failAction = knowledgeAddGroupPostController.options.validate.failAction
      const req = { payload: { name: '' } }
      const h = {
        view: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis(),
        takeover: vi.fn()
      }
      const error = {}

      failAction(req, h, error)

      expect(h.view).toHaveBeenCalledWith('knowledge/add-group', {
        pageTitle: 'Add knowledge group',
        errorMessage: 'Validation failed',
        values: { name: '' }
      })
      expect(h.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
      expect(h.takeover).toHaveBeenCalled()
    })
  })
})
