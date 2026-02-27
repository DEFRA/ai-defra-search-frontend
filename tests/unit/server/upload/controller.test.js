import { describe, test, expect, beforeEach, vi } from 'vitest'
import statusCodes from 'http-status-codes'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')
vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() })
}))

const knowledgeGroupsService = await import('../../../../src/server/services/knowledge-groups-service.js')
const {
  uploadGetController,
  uploadPostController,
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
      redirect: vi.fn().mockReturnThis()
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

    test('renders view without error when knowledge-group is selected', async () => {
      knowledgeGroupsService.listKnowledgeGroups.mockResolvedValue([
        { id: 'g1', name: 'Group 1' }
      ])

      await uploadPostController.handler(
        { payload: { 'knowledge-group': 'g1' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'upload/upload',
        expect.objectContaining({
          errorMessage: null,
          selectedKnowledgeGroup: 'g1'
        })
      )
      expect(mockH.code).not.toHaveBeenCalled()
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
    test('returns 400 when name is empty', async () => {
      await uploadCreateGroupPostController.handler(
        { payload: { name: '', description: 'Desc' } },
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith('upload/create-group', {
        errorMessage: 'Enter a name for the knowledge group',
        values: { name: '', description: 'Desc' }
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
        values: { name: '', description: '' }
      })
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.BAD_REQUEST)
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
        { name: 'My Group', description: 'A desc' }
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/upload')
      expect(mockH.view).not.toHaveBeenCalled()
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
        values: { name: 'Dup', description: '' }
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
        values: { name: 'Test', description: '' }
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
