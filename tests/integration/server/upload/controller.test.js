import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import { vi } from 'vitest'

import { createServer } from '../../../../src/server/server.js'
import { listKnowledgeGroups, createKnowledgeGroup } from '../../../../src/server/services/knowledge-groups-service.js'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')

describe('Upload page', () => {
  let server

  beforeAll(async () => {
    vi.mocked(listKnowledgeGroups).mockResolvedValue([])
    vi.mocked(createKnowledgeGroup).mockResolvedValue({ id: 'new-id', name: 'Test', description: null })
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(listKnowledgeGroups).mockResolvedValue([])
    vi.mocked(createKnowledgeGroup).mockResolvedValue({ id: 'new-id', name: 'Test', description: null })
  })

  afterAll(async () => {
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
<<<<<<< Updated upstream
      nock.cleanAll()
      setupKnowledgeGroupsMock([
||||||| Stash base
      setupKnowledgeGroupsMock([
=======
      vi.mocked(listKnowledgeGroups).mockResolvedValue([
>>>>>>> Stashed changes
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
      const opt1 = select?.querySelector('option[value="g1"]')
      const opt2 = select?.querySelector('option[value="g2"]')

      expect(opt1).toBeTruthy()
      expect(opt2).toBeTruthy()
      expect(opt1.textContent).toContain('Group Alpha')
      expect(opt2.textContent).toContain('Group Beta')
    })

    test('shows empty select when listKnowledgeGroups fails', async () => {
      vi.mocked(listKnowledgeGroups).mockRejectedValue(new Error('API error'))

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
      vi.mocked(createKnowledgeGroup).mockResolvedValue({ id: 'created-id', name: 'New Group', description: 'Desc' })

      const response = await server.inject({
        method: 'POST',
        url: '/upload/create-group',
        payload: { name: 'New Group', description: 'Desc' }
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/upload')
    })

    test('shows API error detail when create fails with string detail', async () => {
      const err = new Error('Group name already exists')
      err.status = 400
      err.detail = 'Group name already exists'
      vi.mocked(createKnowledgeGroup).mockRejectedValue(err)

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
      const err = new Error('API error')
      err.status = 500
      err.detail = { code: 'ERR' }
      vi.mocked(createKnowledgeGroup).mockRejectedValue(err)

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
