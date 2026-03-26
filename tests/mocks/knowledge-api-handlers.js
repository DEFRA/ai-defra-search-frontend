import nock from 'nock'

import { config } from '../../src/config/config.js'

const knowledgeApiBaseUrl = config.get('knowledgeApiUrl') || 'http://localhost:8085'

function setupKnowledgeApiMocks () {
  nock(knowledgeApiBaseUrl)
    .get('/knowledge-groups')
    .reply(200, [
      { id: 'g1', name: 'Test Group', description: 'Desc', information_asset_owner: 'Owner' }
    ])

  nock(knowledgeApiBaseUrl)
    .get('/supported-file-types')
    .reply(200, { extensions: ['docx', 'jsonl', 'pdf', 'pptx'] })

  nock(knowledgeApiBaseUrl)
    .get(/\/documents\?knowledge_group_id=g1/)
    .reply(200, [
      { id: 'd1', file_name: 'doc.pdf', status: 'ready', chunk_count: 10 }
    ])

  nock(knowledgeApiBaseUrl)
    .get(/\/documents\?knowledge_group_id=missing/)
    .reply(404, { detail: 'Knowledge group not found' })

  nock(knowledgeApiBaseUrl)
    .post('/knowledge-group')
    .reply(200, { id: 'new-id', name: 'New Group' })

  return nock
}

function setupKnowledgeApiListError (statusCode = 500) {
  nock.cleanAll()
  nock(knowledgeApiBaseUrl)
    .get('/knowledge-groups')
    .reply(statusCode, { detail: 'API error' })
}

function setupKnowledgeApiGroupError (groupId, statusCode = 404) {
  nock.cleanAll()
  nock(knowledgeApiBaseUrl)
    .get('/knowledge-groups')
    .reply(200, [])
  nock(knowledgeApiBaseUrl)
    .get(new RegExp(`\\/documents\\?knowledge_group_id=${encodeURIComponent(groupId)}`))
    .reply(statusCode, { detail: 'Knowledge group not found' })
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
  nock(knowledgeGroupsApiBaseUrl)
    .persist()
    .get('/supported-file-types')
    .reply(200, { extensions: ['docx', 'jsonl', 'pdf', 'pptx'] })
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
