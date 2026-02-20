import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'
import {
  cleanupKnowledgeApiMocks,
  setupKnowledgeApiGroupError,
  setupKnowledgeApiListError,
  setupKnowledgeApiMocks
} from '../../../mocks/knowledge-api-handlers.js'

describe('Knowledge routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    cleanupKnowledgeApiMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    cleanupKnowledgeApiMocks()
  })

  describe('GET /knowledge', () => {
    test('should return knowledge list page with groups', async () => {
      setupKnowledgeApiMocks()

      const response = await server.inject({
        method: 'GET',
        url: '/knowledge'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Knowledge Management')

      const bodyText = page.body.textContent
      expect(bodyText).toContain('Test Group')
    })

    test('should handle API error and show error message', async () => {
      setupKnowledgeApiListError(500)

      const response = await server.inject({
        method: 'GET',
        url: '/knowledge'
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

      const { window } = new JSDOM(response.result)
      const page = window.document
      const bodyText = page.body.textContent
      expect(bodyText).toContain('API error')
    })
  })

  describe('GET /knowledge/add', () => {
    test('should return add group form', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/knowledge/add'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Add knowledge group')
    })
  })

  describe('GET /knowledge/{groupId}', () => {
    test('should return group page with sources and snapshots', async () => {
      setupKnowledgeApiMocks()

      const response = await server.inject({
        method: 'GET',
        url: '/knowledge/g1'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const bodyText = page.body.textContent
      expect(bodyText).toContain('Test Group')
      expect(bodyText).toContain('Source 1')
    })

    test('should handle group not found', async () => {
      setupKnowledgeApiGroupError('missing')

      const response = await server.inject({
        method: 'GET',
        url: '/knowledge/missing'
      })

      expect(response.statusCode).toBe(statusCodes.NOT_FOUND)
    })
  })

  describe('POST /knowledge/add', () => {
    test('should create group and redirect', async () => {
      setupKnowledgeApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/knowledge/add',
        payload: {
          name: 'New Group',
          description: 'Description',
          owner: 'owner',
          source_name: 's1',
          source_type: 'BLOB',
          source_location: 's3://bucket/key'
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/knowledge')
    })
  })

  describe('POST /knowledge/{groupId}/ingest', () => {
    test('should trigger ingest and redirect', async () => {
      setupKnowledgeApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/knowledge/g1/ingest'
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toContain('/knowledge/g1')
      expect(response.headers.location).toContain('ingested=1')
    })
  })

  describe('POST /knowledge/{groupId}/sources/add', () => {
    test('should add source and redirect', async () => {
      setupKnowledgeApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/knowledge/g1/sources/add',
        payload: {
          source_name: 's2',
          source_type: 'PRECHUNKED_BLOB',
          source_location: 's3://b/k'
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toContain('sourceAdded=1')
    })
  })

  describe('POST /knowledge/{groupId}/query', () => {
    test('should query and render results', async () => {
      setupKnowledgeApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/knowledge/g1/query',
        payload: {
          query: 'test query',
          max_results: 5
        }
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document
      const bodyText = page.body.textContent
      expect(bodyText).toContain('result')
    })
  })
})
