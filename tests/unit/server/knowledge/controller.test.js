import { describe, test, expect, beforeEach, vi } from 'vitest'
import statusCodes from 'http-status-codes'

vi.mock('../../../../src/server/services/knowledge-service.js')
vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() })
}))

const knowledgeApi = await import('../../../../src/server/services/knowledge-service.js')
const {
  knowledgeListController,
  knowledgeGroupController,
  knowledgeAddGroupGetController,
  knowledgeAddGroupPostController,
  knowledgeIngestController,
  knowledgeAddSourceController,
  knowledgeRemoveSourceController,
  knowledgeActivateSnapshotController,
  knowledgeQueryController
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
    test('should render list with groups and sourceCount', async () => {
      knowledgeApi.listGroups.mockResolvedValue([
        { groupId: 'g1', title: 'G1', sources: { s1: {}, s2: {} } }
      ])

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', {
        pageTitle: 'Knowledge Management',
        groups: [{ groupId: 'g1', title: 'G1', sources: { s1: {}, s2: {} }, sourceCount: 2 }],
        errorMessage: null
      })
    })

    test('should handle non-array response', async () => {
      knowledgeApi.listGroups.mockResolvedValue(null)

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
      knowledgeApi.listGroups.mockRejectedValue(err)

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', {
        pageTitle: 'Knowledge Management',
        groups: [],
        errorMessage: 'Detail message'
      })
      expect(mockH.code).toHaveBeenCalledWith(503)
    })

    test('should use err.message when err.detail is missing', async () => {
      knowledgeApi.listGroups.mockRejectedValue(new Error('Network error'))

      await knowledgeListController.handler({}, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/knowledge', expect.objectContaining({
        errorMessage: 'Network error'
      }))
    })
  })

  describe('knowledgeGroupController', () => {
    test('should render group with sources and snapshots', async () => {
      const group = { groupId: 'g1', title: 'My Group', sources: { s1: { id: 's1' } } }
      const snapshots = [{ snapshot_id: 'snap1', source_chunk_counts: { s1: 5 } }]
      knowledgeApi.getGroup.mockResolvedValue(group)
      knowledgeApi.listGroupSnapshots.mockResolvedValue(snapshots)

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'My Group – Knowledge',
        group,
        sources: [{ id: 's1' }],
        errorMessage: null
      }))
      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        snapshots: expect.arrayContaining([
          expect.objectContaining({ snapshot_id: 'snap1', source_chunk_summary: '5' })
        ])
      }))
    })

    test('should render error view on failure', async () => {
      const err = new Error('Not found')
      err.detail = 'Group not found'
      err.status = 404
      knowledgeApi.getGroup.mockRejectedValue(err)
      knowledgeApi.listGroupSnapshots.mockResolvedValue([])

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        pageTitle: 'Knowledge Group – Error',
        errorMessage: 'Group not found',
        sources: [],
        snapshots: []
      }))
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    test('should handle group with no sources', async () => {
      const group = { groupId: 'g1', title: 'Empty Group', sources: undefined }
      const snapshots = [{ snapshot_id: 's1', source_chunk_counts: {} }]
      knowledgeApi.getGroup.mockResolvedValue(group)
      knowledgeApi.listGroupSnapshots.mockResolvedValue(snapshots)

      const request = { params: { groupId: 'g1' } }
      await knowledgeGroupController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        sources: [],
        snapshots: expect.arrayContaining([
          expect.objectContaining({ source_chunk_summary: null })
        ])
      }))
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
      knowledgeApi.createGroup.mockResolvedValue()

      const request = {
        payload: {
          name: 'Test',
          description: 'Desc',
          owner: 'owner',
          source_name: 's1',
          source_type: 'BLOB',
          source_location: 's3://b/k'
        }
      }
      await knowledgeAddGroupPostController.handler(request, mockH)

      expect(knowledgeApi.createGroup).toHaveBeenCalledWith({
        name: 'Test',
        description: 'Desc',
        owner: 'owner',
        sources: [{ name: 's1', type: 'BLOB', location: 's3://b/k' }]
      })
      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge')
    })

    test('should render error view on create failure', async () => {
      knowledgeApi.createGroup.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'API error', status: 500 }))

      const request = {
        payload: { name: 'T', description: 'D', owner: 'o', source_name: 's', source_type: 'BLOB', source_location: 'loc' }
      }
      await knowledgeAddGroupPostController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/add-group', {
        pageTitle: 'Add knowledge group',
        errorMessage: 'API error',
        values: request.payload
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })
  })

  describe('knowledgeIngestController', () => {
    test('should ingest and redirect with success', async () => {
      knowledgeApi.ingestGroup.mockResolvedValue()

      const request = { params: { groupId: 'g1' } }
      await knowledgeIngestController.handler(request, mockH)

      expect(knowledgeApi.ingestGroup).toHaveBeenCalledWith('g1')
      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?ingested=1#ingest')
    })

    test('should redirect with error on failure', async () => {
      knowledgeApi.ingestGroup.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'Ingest failed' }))

      const request = { params: { groupId: 'g1' } }
      await knowledgeIngestController.handler(request, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?error=' + encodeURIComponent('Ingest failed'))
    })
  })

  describe('knowledgeAddSourceController', () => {
    test('should add source and redirect', async () => {
      knowledgeApi.addSourceToGroup.mockResolvedValue()

      const request = {
        params: { groupId: 'g1' },
        payload: { source_name: 's1', source_type: 'PRECHUNKED_BLOB', source_location: 's3://b/k' }
      }
      await knowledgeAddSourceController.handler(request, mockH)

      expect(knowledgeApi.addSourceToGroup).toHaveBeenCalledWith('g1', {
        name: 's1',
        type: 'PRECHUNKED_BLOB',
        location: 's3://b/k'
      })
      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?sourceAdded=1')
    })

    test('should redirect with error on failure', async () => {
      knowledgeApi.addSourceToGroup.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'Add failed' }))

      const request = {
        params: { groupId: 'g1' },
        payload: { source_name: 's', source_type: 'BLOB', source_location: 'loc' }
      }
      await knowledgeAddSourceController.handler(request, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?error=' + encodeURIComponent('Add failed'))
    })
  })

  describe('knowledgeRemoveSourceController', () => {
    test('should remove source and redirect', async () => {
      knowledgeApi.removeSourceFromGroup.mockResolvedValue()

      const request = { params: { groupId: 'g1', sourceId: 's1' } }
      await knowledgeRemoveSourceController.handler(request, mockH)

      expect(knowledgeApi.removeSourceFromGroup).toHaveBeenCalledWith('g1', 's1')
      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?sourceRemoved=1')
    })

    test('should redirect with error on failure', async () => {
      knowledgeApi.removeSourceFromGroup.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'Remove failed' }))

      const request = { params: { groupId: 'g1', sourceId: 's1' } }
      await knowledgeRemoveSourceController.handler(request, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?error=' + encodeURIComponent('Remove failed'))
    })
  })

  describe('knowledgeActivateSnapshotController', () => {
    test('should activate snapshot and redirect', async () => {
      knowledgeApi.activateSnapshot.mockResolvedValue()

      const request = { params: { groupId: 'g1', snapshotId: 'snap1' } }
      await knowledgeActivateSnapshotController.handler(request, mockH)

      expect(knowledgeApi.activateSnapshot).toHaveBeenCalledWith('snap1')
      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?activated=1')
    })

    test('should redirect with error on failure', async () => {
      knowledgeApi.activateSnapshot.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'Activate failed' }))

      const request = { params: { groupId: 'g1', snapshotId: 'snap1' } }
      await knowledgeActivateSnapshotController.handler(request, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?error=' + encodeURIComponent('Activate failed'))
    })
  })

  describe('knowledgeQueryController', () => {
    test('should query and render group view with results', async () => {
      const group = { groupId: 'g1', title: 'G1', sources: {} }
      const snapshots = []
      const queryResults = [{ chunk_id: 'c1', content: 'answer' }]
      knowledgeApi.getGroup.mockResolvedValue(group)
      knowledgeApi.listGroupSnapshots.mockResolvedValue(snapshots)
      knowledgeApi.querySnapshot.mockResolvedValue(queryResults)

      const request = {
        params: { groupId: 'g1' },
        payload: { query: 'test query', max_results: 3 }
      }
      await knowledgeQueryController.handler(request, mockH)

      expect(knowledgeApi.querySnapshot).toHaveBeenCalledWith('g1', 'test query', 3)
      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        queryResults: [{ chunk_id: 'c1', content: 'answer' }],
        lastQuery: 'test query',
        lastMaxResults: 3
      }))
    })

    test('should redirect with error on query failure', async () => {
      knowledgeApi.getGroup.mockResolvedValue({})
      knowledgeApi.listGroupSnapshots.mockResolvedValue([])
      knowledgeApi.querySnapshot.mockRejectedValue(Object.assign(new Error('Fail'), { detail: 'Query failed' }))

      const request = {
        params: { groupId: 'g1' },
        payload: { query: 'q', max_results: 5 }
      }
      await knowledgeQueryController.handler(request, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/knowledge/g1?error=' + encodeURIComponent('Query failed'))
    })

    test('should handle non-array queryResults', async () => {
      knowledgeApi.getGroup.mockResolvedValue({ groupId: 'g1', title: 'G1', sources: {} })
      knowledgeApi.listGroupSnapshots.mockResolvedValue([])
      knowledgeApi.querySnapshot.mockResolvedValue(null)

      const request = {
        params: { groupId: 'g1' },
        payload: { query: 'q', max_results: 5 }
      }
      await knowledgeQueryController.handler(request, mockH)

      expect(mockH.view).toHaveBeenCalledWith('knowledge/group', expect.objectContaining({
        queryResults: []
      }))
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

    test('knowledgeAddSourceController failAction redirects with addError', () => {
      const failAction = knowledgeAddSourceController.options.validate.failAction
      const req = { params: { groupId: 'g1' } }
      const h = { redirect: vi.fn().mockReturnThis(), takeover: vi.fn() }
      const error = { details: [{ message: 'source_name is required' }] }

      failAction(req, h, error)

      expect(h.redirect).toHaveBeenCalledWith('/knowledge/g1?addError=' + encodeURIComponent('source_name is required'))
      expect(h.takeover).toHaveBeenCalled()
    })

    test('knowledgeQueryController failAction redirects with queryError', () => {
      const failAction = knowledgeQueryController.options.validate.failAction
      const req = { params: { groupId: 'g1' } }
      const h = { redirect: vi.fn().mockReturnThis(), takeover: vi.fn() }
      const error = { details: [{ message: 'query is required' }] }

      failAction(req, h, error)

      expect(h.redirect).toHaveBeenCalledWith('/knowledge/g1?queryError=' + encodeURIComponent('query is required'))
      expect(h.takeover).toHaveBeenCalled()
    })
  })
})
