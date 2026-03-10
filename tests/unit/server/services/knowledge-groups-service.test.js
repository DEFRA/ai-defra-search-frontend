import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'

import {
  listKnowledgeGroups,
  createKnowledgeGroup,
  createDocuments,
  listDocumentsByKnowledgeGroup
} from '../../../../src/server/services/knowledge-groups-service.js'
import { config } from '../../../../src/config/config.js'
import { getUserId } from '../../../../src/server/common/helpers/user-context.js'

vi.mock('../../../../src/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'knowledgeApiUrl') {
        return baseUrl
      }
      if (key === 'knowledgeApiTimeoutMs') {
        return 10000
      }
      return null
    })
  }
}))
vi.mock('../../../../src/server/common/helpers/user-context.js', () => ({
  getUserId: vi.fn()
}))

const baseUrl = 'http://localhost:9999'

describe('knowledge-groups-service', () => {
  beforeEach(() => {
    nock.cleanAll()
    getUserId.mockReturnValue('user-1')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('listKnowledgeGroups', () => {
    test('returns [] when knowledgeApiUrl is not configured', async () => {
      config.get.mockReturnValueOnce(null)

      const result = await listKnowledgeGroups()

      expect(result).toEqual([])
    })

    test('returns [] when user context has no ID', async () => {
      getUserId.mockReturnValue(null)

      const result = await listKnowledgeGroups()

      expect(result).toEqual([])
    })

    test('returns groups from API', async () => {
      getUserId.mockReturnValue('user-123')
      nock(baseUrl)
        .get('/knowledge-groups')
        .matchHeader('user-id', 'user-123')
        .reply(200, [{ id: 'g1', name: 'Group 1' }, { id: 'g2', name: 'Group 2' }])

      const result = await listKnowledgeGroups()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 'g1', name: 'Group 1' })
      expect(result[1]).toEqual({ id: 'g2', name: 'Group 2' })
    })

    test('strips trailing slash from base URL', async () => {
      config.get.mockReturnValueOnce(`${baseUrl}/`)

      nock(baseUrl)
        .get('/knowledge-groups')
        .reply(200, [])

      await listKnowledgeGroups()

      expect(nock.isDone()).toBe(true)
    })

    test('throws when API returns non-ok', async () => {
      nock(baseUrl)
        .get('/knowledge-groups')
        .reply(500, 'Internal Server Error')

      await expect(listKnowledgeGroups()).rejects.toThrow(
        /Knowledge API 500: Internal Server Error/
      )
    })
  })

  describe('createDocuments', () => {
    test('throws when knowledgeApiUrl is not configured', async () => {
      config.get.mockReturnValueOnce(null)

      await expect(createDocuments([{ file_name: 'a.pdf' }])).rejects.toThrow(
        'Knowledge API URL is not configured'
      )
    })

    test('POSTs documents to the knowledge API', async () => {
      const documents = [
        {
          file_name: 'photo.jpg',
          knowledge_group_id: 'group-1',
          cdp_upload_id: 'upload-ref-123',
          status: 'uploaded',
          s3_key: 'uploads/group-1/c17543b8-e440-4156-8df4-af62f40a7ac8'
        }
      ]

      nock(baseUrl)
        .post('/documents', documents)
        .matchHeader('user-id', 'user-1')
        .reply(201, documents)

      const result = await createDocuments(documents)

      expect(result).toEqual(documents)
    })

    test('throws when knowledge API responds with non-2xx', async () => {
      nock(baseUrl)
        .post('/documents')
        .reply(500, 'Internal Server Error')

      await expect(createDocuments([{ file_name: 'photo.jpg' }])).rejects.toThrow(
        /Knowledge API 500/
      )
    })
  })

  describe('listDocumentsByKnowledgeGroup', () => {
    test('returns [] when knowledgeApiUrl is not configured', async () => {
      config.get.mockReturnValueOnce(null)

      const result = await listDocumentsByKnowledgeGroup('kg-1')

      expect(result).toEqual([])
    })

    test('returns [] when user context has no ID', async () => {
      getUserId.mockReturnValue(null)

      const result = await listDocumentsByKnowledgeGroup('kg-1')

      expect(result).toEqual([])
    })

    test('returns documents from API', async () => {
      const docs = [
        { id: 'd1', file_name: 'guide.pdf', knowledge_group_id: 'kg-1', created_at: '2025-03-05T12:00:00Z' }
      ]
      nock(baseUrl)
        .get('/documents')
        .query({ knowledge_group_id: 'kg-1' })
        .matchHeader('user-id', 'user-1')
        .reply(200, docs)

      const result = await listDocumentsByKnowledgeGroup('kg-1')

      expect(result).toEqual(docs)
    })

    test('strips trailing slash from base URL', async () => {
      config.get.mockReturnValueOnce(`${baseUrl}/`)

      nock(baseUrl)
        .get('/documents')
        .query({ knowledge_group_id: 'kg-1' })
        .reply(200, [])

      await listDocumentsByKnowledgeGroup('kg-1')

      expect(nock.isDone()).toBe(true)
    })

    test('includes user-id header when userId present', async () => {
      getUserId.mockReturnValue('user-xyz')
      nock(baseUrl)
        .get('/documents')
        .query({ knowledge_group_id: 'kg-1' })
        .matchHeader('user-id', 'user-xyz')
        .reply(200, [])

      await listDocumentsByKnowledgeGroup('kg-1')

      expect(nock.isDone()).toBe(true)
    })

    test('throws when API returns non-ok', async () => {
      nock(baseUrl)
        .get('/documents')
        .query({ knowledge_group_id: 'kg-1' })
        .reply(404, 'Not Found')

      await expect(listDocumentsByKnowledgeGroup('kg-1')).rejects.toThrow(
        /Knowledge API 404: Not Found/
      )
    })
  })

  describe('createKnowledgeGroup', () => {
    test('throws when knowledgeApiUrl is not configured', async () => {
      config.get.mockReturnValueOnce(null)

      await expect(
        createKnowledgeGroup({ name: 'Test', description: 'Desc' })
      ).rejects.toThrow('Knowledge API or user not configured')
    })

    test('throws when user context has no ID', async () => {
      getUserId.mockReturnValue(null)

      await expect(
        createKnowledgeGroup({ name: 'Test', description: 'Desc' })
      ).rejects.toThrow('Knowledge API or user not configured')
    })

    test('POSTs group and returns created group', async () => {
      getUserId.mockReturnValue('user-xyz')
      let capturedBody
      nock(baseUrl)
        .post('/knowledge-group', (body) => {
          capturedBody = body
          return true
        })
        .matchHeader('user-id', 'user-xyz')
        .reply(201, { id: 'new-id', name: 'My Group', description: 'A desc' })

      const result = await createKnowledgeGroup({
        name: 'My Group',
        description: 'A desc'
      })

      expect(capturedBody).toEqual({ name: 'My Group', description: 'A desc', information_asset_owner: null })
      expect(result).toEqual({ id: 'new-id', name: 'My Group', description: 'A desc' })
    })

    test('sends null for description when omitted', async () => {
      let capturedBody
      nock(baseUrl)
        .post('/knowledge-group', (body) => {
          capturedBody = body
          return true
        })
        .reply(201, { id: 'g1', name: 'No Desc' })

      await createKnowledgeGroup({ name: 'No Desc' })

      expect(capturedBody).toEqual({ name: 'No Desc', description: null, information_asset_owner: null })
    })

    test('strips trailing slash from base URL', async () => {
      config.get.mockReturnValueOnce(`${baseUrl}/`)

      nock(baseUrl)
        .post('/knowledge-group')
        .reply(201, { id: 'g1', name: 'Test' })

      await createKnowledgeGroup({ name: 'Test' })

      expect(nock.isDone()).toBe(true)
    })

    test('throws with detail when API returns JSON error body', async () => {
      nock(baseUrl)
        .post('/knowledge-group')
        .reply(400, { detail: 'Group name already exists' })

      const err = await createKnowledgeGroup({ name: 'Dup' }).catch((e) => e)

      expect(err.status).toBe(400)
      expect(err.detail).toBe('Group name already exists')
      expect(err.message).toContain('Group name already exists')
    })

    test('throws with detail when API returns plain text error', async () => {
      nock(baseUrl)
        .post('/knowledge-group')
        .reply(500, 'plain text error')

      const err = await createKnowledgeGroup({ name: 'Test' }).catch((e) => e)

      expect(err.detail).toBe('plain text error')
    })

    test('throws with stringified detail when detail is object', async () => {
      nock(baseUrl)
        .post('/knowledge-group')
        .reply(400, { detail: { code: 'ERR', message: 'Invalid' } })

      const err = await createKnowledgeGroup({ name: 'Test' }).catch((e) => e)

      expect(err.detail).toEqual({ code: 'ERR', message: 'Invalid' })
      expect(err.message).toContain('{"code":"ERR","message":"Invalid"}')
    })
  })
})
