import nock from 'nock'

import { config } from '../../src/config/config.js'

const knowledgeApiBaseUrl = config.get('knowledgeApiUrl') || 'http://localhost:8085'

function setupKnowledgeApiMocks () {
  nock(knowledgeApiBaseUrl)
    .get('/knowledge/groups')
    .reply(200, [
      { groupId: 'g1', title: 'Test Group', description: 'Desc', sources: { s1: {} } }
    ])

  nock(knowledgeApiBaseUrl)
    .get('/knowledge/groups/g1')
    .reply(200, {
      groupId: 'g1',
      title: 'Test Group',
      description: 'Desc',
      sources: { s1: { id: 's1', name: 'Source 1', sourceId: 's1', type: 'BLOB', location: 's3://b/k' } },
      activeSnapshot: 'snap1'
    })

  nock(knowledgeApiBaseUrl)
    .get('/knowledge/groups/g1/snapshots')
    .reply(200, [
      { snapshot_id: 'snap1', version: 'v1', created_at: '2024-01-15T10:00:00Z', chunk_count: 10, source_chunk_counts: { s1: 10 } }
    ])

  nock(knowledgeApiBaseUrl)
    .post('/knowledge/groups')
    .reply(201, {})

  nock(knowledgeApiBaseUrl)
    .post('/knowledge/groups/g1/ingest')
    .reply(204)

  nock(knowledgeApiBaseUrl)
    .patch('/knowledge/groups/g1/sources')
    .reply(200, {})

  nock(knowledgeApiBaseUrl)
    .delete('/knowledge/groups/g1/sources/s1')
    .reply(204)

  nock(knowledgeApiBaseUrl)
    .patch('/snapshots/snap1/activate')
    .reply(200, {})

  nock(knowledgeApiBaseUrl)
    .post('/snapshots/query')
    .reply(200, [{
      content: 'result',
      similarityScore: 0.9,
      similarityCategory: 'high',
      name: 'Test',
      location: '/path',
      sourceId: 's1'
    }])

  return nock
}

function setupKnowledgeApiListError (statusCode = 500) {
  nock.cleanAll()
  nock(knowledgeApiBaseUrl)
    .get('/knowledge/groups')
    .reply(statusCode, { detail: 'API error' })
}

function setupKnowledgeApiGroupError (groupId, statusCode = 404) {
  nock.cleanAll()
  nock(knowledgeApiBaseUrl)
    .get(`/knowledge/groups/${groupId}`)
    .reply(statusCode, { detail: 'Not found' })
  nock(knowledgeApiBaseUrl)
    .get(`/knowledge/groups/${groupId}/snapshots`)
    .reply(200, [])
}

function cleanupKnowledgeApiMocks () {
  nock.cleanAll()
}

const knowledgeGroupsApiBaseUrl = 'http://localhost:9999'

function setupKnowledgeGroupsMock () {
  nock(knowledgeGroupsApiBaseUrl)
    .persist()
    .get('/knowledge-groups')
    .reply(200, [{ id: 'kg-1', name: 'Test Knowledge Group' }])
}

function setupKnowledgeGroupsEmptyMock () {
  nock(knowledgeGroupsApiBaseUrl)
    .persist()
    .get('/knowledge-groups')
    .reply(200, [])
}

function setupKnowledgeGroupsErrorMock () {
  nock(knowledgeGroupsApiBaseUrl)
    .persist()
    .get('/knowledge-groups')
    .reply(500, { error: 'Knowledge groups API error' })
}

export {
  cleanupKnowledgeApiMocks,
  setupKnowledgeApiMocks,
  setupKnowledgeApiListError,
  setupKnowledgeApiGroupError,
  setupKnowledgeGroupsMock,
  setupKnowledgeGroupsEmptyMock,
  setupKnowledgeGroupsErrorMock
}
