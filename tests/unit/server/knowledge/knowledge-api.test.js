import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'

import {
  listGroups,
  getGroup,
  listGroupSnapshots,
  createGroup,
  ingestGroup,
  addSourceToGroup,
  removeSourceFromGroup,
  activateSnapshot,
  querySnapshot
} from '../../../../src/server/knowledge/knowledge-api.js'
import { config } from '../../../../src/config/config.js'

describe('knowledge-api', () => {
  const dataApiUrl = config.get('dataApiUrl')

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('listGroups', () => {
    test('should return groups array', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups')
        .reply(200, [{ groupId: 'g1', title: 'Group 1', sources: {} }])

      const result = await listGroups()

      expect(result).toHaveLength(1)
      expect(result[0].groupId).toBe('g1')
      expect(result[0].title).toBe('Group 1')
    })

    test('should throw when API returns 500', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups')
        .reply(500, { detail: 'Internal error' })

      const err = await listGroups().catch(e => e)
      expect(err.status).toBe(500)
      expect(err.detail).toBe('Internal error')
    })
  })

  describe('getGroup', () => {
    test('should fetch group by id', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups/g1')
        .reply(200, { groupId: 'g1', title: 'My Group', sources: { s1: {} } })

      const result = await getGroup('g1')

      expect(result.groupId).toBe('g1')
      expect(result.title).toBe('My Group')
      expect(Object.keys(result.sources)).toHaveLength(1)
    })
  })

  describe('listGroupSnapshots', () => {
    test('should return snapshots for group', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups/g1/snapshots')
        .reply(200, [{ snapshot_id: 'snap1', source_chunk_counts: { s1: 10 } }])

      const result = await listGroupSnapshots('g1')

      expect(result).toHaveLength(1)
      expect(result[0].snapshot_id).toBe('snap1')
      expect(result[0].source_chunk_counts).toEqual({ s1: 10 })
    })
  })

  describe('createGroup', () => {
    test('should POST group with sources', async () => {
      let capturedBody
      nock(dataApiUrl)
        .post('/knowledge/groups', (body) => {
          capturedBody = body
          return true
        })
        .reply(201, {})

      await createGroup({
        name: 'Test',
        description: 'Desc',
        owner: 'owner',
        sources: [{ name: 's1', type: 'BLOB', location: 's3://bucket/key' }]
      })

      expect(capturedBody).toEqual({
        name: 'Test',
        description: 'Desc',
        owner: 'owner',
        sources: [{ name: 's1', type: 'BLOB', location: 's3://bucket/key' }]
      })
    })
  })

  describe('ingestGroup', () => {
    test('should POST to ingest endpoint', async () => {
      nock(dataApiUrl)
        .post('/knowledge/groups/g1/ingest')
        .reply(204)

      const result = await ingestGroup('g1')
      expect(result).toEqual([])
    })
  })

  describe('addSourceToGroup', () => {
    test('should PATCH source to group', async () => {
      let capturedBody
      nock(dataApiUrl)
        .patch('/knowledge/groups/g1/sources', (body) => {
          capturedBody = body
          return true
        })
        .reply(200, {})

      await addSourceToGroup('g1', {
        name: 's1',
        type: 'PRECHUNKED_BLOB',
        location: 's3://b/k'
      })

      expect(capturedBody).toEqual({
        name: 's1',
        type: 'PRECHUNKED_BLOB',
        location: 's3://b/k'
      })
    })
  })

  describe('removeSourceFromGroup', () => {
    test('should DELETE source', async () => {
      nock(dataApiUrl)
        .delete('/knowledge/groups/g1/sources/sid1')
        .reply(204)

      const result = await removeSourceFromGroup('g1', 'sid1')
      expect(result).toEqual([])
    })
  })

  describe('activateSnapshot', () => {
    test('should PATCH activate snapshot', async () => {
      nock(dataApiUrl)
        .patch('/snapshots/snap1/activate')
        .reply(200, {})

      await activateSnapshot('snap1')
    })
  })

  describe('querySnapshot', () => {
    test('should POST query with groupId, query, maxResults', async () => {
      let capturedBody
      nock(dataApiUrl)
        .post('/snapshots/query', (body) => {
          capturedBody = body
          return true
        })
        .reply(200, [{ chunk_id: 'c1', content: 'foo' }])

      const result = await querySnapshot('g1', 'test query', 10)

      expect(capturedBody).toEqual({ groupId: 'g1', query: 'test query', maxResults: 10 })
      expect(result).toHaveLength(1)
      expect(result[0].chunk_id).toBe('c1')
    })

    test('should use default maxResults of 5', async () => {
      let capturedBody
      nock(dataApiUrl)
        .post('/snapshots/query', (body) => {
          capturedBody = body
          return true
        })
        .reply(200, [])

      await querySnapshot('g1', 'q')

      expect(capturedBody.maxResults).toBe(5)
    })
  })

  describe('request error handling', () => {
    test('should attach detail from JSON error body', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups')
        .reply(400, { detail: 'Bad request detail' })

      const err = await listGroups().catch(e => e)
      expect(err.detail).toBe('Bad request detail')
      expect(err.status).toBe(400)
    })

    test('should handle non-JSON error body', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups')
        .reply(500, 'plain text error')

      const err = await listGroups().catch(e => e)
      expect(err.detail).toBe('plain text error')
    })

    test('should handle detail as object in error response', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups')
        .reply(400, { detail: { code: 'ERR', message: 'Invalid' } })

      const err = await listGroups().catch(e => e)
      expect(err.detail).toEqual({ code: 'ERR', message: 'Invalid' })
      expect(err.message).toContain('{"code":"ERR","message":"Invalid"}')
    })

    test('should handle network error', async () => {
      nock(dataApiUrl)
        .get('/knowledge/groups')
        .replyWithError('ECONNREFUSED')

      await expect(listGroups()).rejects.toThrow()
    })
  })
})
