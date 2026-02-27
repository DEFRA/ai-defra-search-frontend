import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import nock from 'nock'

import { createServer } from '../../../../src/server/server.js'
import { config } from '../../../../src/config/config.js'

function setupKnowledgeGroupsMock (groups = []) {
  const base = config.get('knowledgeApiUrl')?.replace(/\/$/, '') ?? ''
  if (base) {
    nock(base)
      .get('/knowledge-groups')
      .matchHeader('user-id', /.*/)
      .reply(200, groups)
      .persist()
  }
}

function setupCreateGroupMock (status = 201, body = { id: 'new-id', name: 'Test', description: null }) {
  const base = config.get('knowledgeApiUrl')?.replace(/\/$/, '') ?? ''
  if (base) {
    return nock(base)
      .post('/knowledge-group', () => true)
      .matchHeader('user-id', /.*/)
      .reply(status, body)
  }
  return null
}

describe('Upload page', () => {
  let server

  beforeAll(async () => {
    setupKnowledgeGroupsMock([])
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    nock.cleanAll()
    setupKnowledgeGroupsMock([])
  })

  afterAll(async () => {
    nock.cleanAll()
    await server.stop({ timeout: 0 })
  })

  describe('GET /upload', () => {
    test('displays the upload page with file input and upload button', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/upload'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      expect(page.body.textContent).toContain('Upload')
      expect(page.body.textContent).toContain('Knowledge group')
      expect(page.querySelector('select#knowledge-group')).not.toBeNull()
      expect(page.body.textContent).toContain('Choose a file')
      expect(page.querySelector('input[type="file"]')).not.toBeNull()
      expect(page.querySelector('button[type="submit"]')).not.toBeNull()
    })

    test('populates knowledge group dropdown when API returns groups', async () => {
      nock.cleanAll()
      setupKnowledgeGroupsMock([
        { id: 'g1', name: 'Group Alpha' },
        { id: 'g2', name: 'Group Beta' }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/upload'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document
      const select = page.querySelector('select#knowledge-group')

      expect(select.querySelector('option[value="g1"]')?.textContent).toContain('Group Alpha')
      expect(select.querySelector('option[value="g2"]')?.textContent).toContain('Group Beta')
    })

    test('shows empty select when listKnowledgeGroups fails', async () => {
      nock.cleanAll()
      const base = config.get('knowledgeApiUrl')?.replace(/\/$/, '') ?? ''
      if (base) {
        nock(base)
          .get('/knowledge-groups')
          .reply(500, 'API error')
      }

      const response = await server.inject({
        method: 'GET',
        url: '/upload'
      })

      expect(response.statusCode).toBe(statusCodes.OK)
      const { window } = new JSDOM(response.result)
      const page = window.document
      const options = page.querySelectorAll('select#knowledge-group option')
      expect(options.length).toBe(1)
      expect(options[0].value).toBe('')
      expect(options[0].textContent).toContain('Select a group')
    })
  })

  describe('POST /upload', () => {
    test('shows error banner when submitting without selecting a knowledge group', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload',
        payload: { 'knowledge-group': '' }
      })

      expect(response.statusCode).toBe(400)

      const { window } = new JSDOM(response.result)
      const page = window.document

      expect(page.body.textContent).toContain('There is a problem')
      expect(page.body.textContent).toContain('Select a knowledge group')
      expect(page.querySelector('a[href="#knowledge-group"]')).not.toBeNull()
    })

    test('accepts valid submission with knowledge group selected', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload',
        payload: { 'knowledge-group': 'some-group-id' }
      })

      expect(response.statusCode).toBe(200)
      expect(response.result).not.toContain('There is a problem')
    })
  })

  describe('GET /upload/create-group', () => {
    test('displays create group form', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/upload/create-group'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      expect(page.body.textContent).toMatch(/create|knowledge group/i)
      expect(page.querySelector('input[name="name"]')).not.toBeNull()
      expect(page.querySelector('textarea[name="description"]')).not.toBeNull()
      expect(page.querySelector('form[action="/upload/create-group"]')).not.toBeNull()
    })
  })

  describe('POST /upload/create-group', () => {
    test('returns 400 when name is empty', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload/create-group',
        payload: { name: '   ', description: 'A desc' }
      })

      expect(response.statusCode).toBe(400)

      const { window } = new JSDOM(response.result)
      const page = window.document
      expect(page.body.textContent).toContain('Enter a name for the knowledge group')
    })

    test('redirects to /upload on success', async () => {
      setupCreateGroupMock(201, { id: 'created-id', name: 'New Group', description: 'Desc' })

      const response = await server.inject({
        method: 'POST',
        url: '/upload/create-group',
        payload: { name: 'New Group', description: 'Desc' }
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/upload')
    })

    test('shows API error detail when create fails with string detail', async () => {
      setupCreateGroupMock(400, { detail: 'Group name already exists' })

      const response = await server.inject({
        method: 'POST',
        url: '/upload/create-group',
        payload: { name: 'Dup', description: '' }
      })

      expect(response.statusCode).toBe(400)

      const { window } = new JSDOM(response.result)
      const page = window.document
      expect(page.body.textContent).toContain('Group name already exists')
    })

    test('shows generic error when create fails without string detail', async () => {
      setupCreateGroupMock(500, { detail: { code: 'ERR' } })

      const response = await server.inject({
        method: 'POST',
        url: '/upload/create-group',
        payload: { name: 'Test', description: '' }
      })

      expect(response.statusCode).toBe(500)

      const { window } = new JSDOM(response.result)
      const page = window.document
      expect(page.body.textContent).toContain('Failed to create knowledge group')
    })
  })
})
