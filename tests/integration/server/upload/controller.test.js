import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import { vi } from 'vitest'

import { createServer } from '../../../../src/server/server.js'
import { listKnowledgeGroups, createKnowledgeGroup } from '../../../../src/server/services/knowledge-groups-service.js'
import { initiateUpload } from '../../../../src/server/services/cdp-uploader-service.js'
import { getUploadSession, storeUploadSession } from '../../../../src/server/upload/upload-session-cache.js'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')
vi.mock('../../../../src/server/services/cdp-uploader-service.js')
vi.mock('../../../../src/server/upload/upload-session-cache.js')

describe('Upload page', () => {
  let server

  beforeAll(async () => {
    vi.mocked(listKnowledgeGroups).mockResolvedValue([])
    vi.mocked(createKnowledgeGroup).mockResolvedValue({ id: 'new-id', name: 'Test', description: null })
    vi.mocked(initiateUpload).mockResolvedValue({
      uploadId: 'test-upload-id',
      uploadUrl: '/upload-and-scan/test-upload-id',
      statusUrl: '/status/test-upload-id',
      uploadReference: 'test-upload-ref'
    })
    vi.mocked(storeUploadSession).mockResolvedValue(undefined)
    vi.mocked(getUploadSession).mockResolvedValue({
      uploadId: 'test-upload-id',
      statusUrl: '/status/test-upload-id',
      knowledgeGroupId: 'some-group-id'
    })
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(listKnowledgeGroups).mockResolvedValue([])
    vi.mocked(createKnowledgeGroup).mockResolvedValue({ id: 'new-id', name: 'Test', description: null })
    vi.mocked(initiateUpload).mockResolvedValue({
      uploadId: 'test-upload-id',
      uploadUrl: '/upload-and-scan/test-upload-id',
      statusUrl: '/status/test-upload-id',
      uploadReference: 'test-upload-ref'
    })
    vi.mocked(storeUploadSession).mockResolvedValue(undefined)
    vi.mocked(getUploadSession).mockResolvedValue({
      uploadId: 'test-upload-id',
      statusUrl: '/status/test-upload-id',
      knowledgeGroupId: 'some-group-id'
    })
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /upload', () => {
    test('displays the knowledge group selection step with a continue button', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/upload'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      expect(page.body.textContent).toContain('Upload files to knowledge group')
      expect(page.body.textContent).toContain('Select knowledge group')
      expect(page.querySelector('select#knowledge-group')).not.toBeNull()
      expect(page.querySelector('button[type="submit"]')).not.toBeNull()
      expect(page.querySelector('a[href="/upload/create-group"]')).not.toBeNull()
    })

    test('populates knowledge group dropdown when API returns groups', async () => {
      vi.mocked(listKnowledgeGroups).mockResolvedValue([
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

    test('redirects to /upload/files/{uploadReference} when group is selected', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload',
        payload: { 'knowledge-group': 'some-group-id' }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/upload/files/test-upload-ref')
    })

    test('returns 500 and shows error when initiateUpload throws', async () => {
      vi.mocked(initiateUpload).mockRejectedValue(new Error('CDP unavailable'))

      const response = await server.inject({
        method: 'POST',
        url: '/upload',
        payload: { 'knowledge-group': 'some-group-id' }
      })

      expect(response.statusCode).toBe(500)

      const { window } = new JSDOM(response.result)
      const page = window.document
      expect(page.body.textContent).toContain('Failed to start upload')
    })
  })

  describe('GET /upload/files/{uploadReference}', () => {
    test('renders a no-JS-compatible file upload page targeting the CDP uploader', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/upload/files/test-upload-ref'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document
      const form = page.querySelector('form#file-upload-form')
      const fileInput = page.querySelector('input[type="file"][name="file"]')
      const selectedFilesSection = page.querySelector('#selected-files-section')

      expect(form).not.toBeNull()
      expect(form.getAttribute('action')).toContain('/upload-and-scan/test-upload-id')
      expect(form.getAttribute('enctype')).toBe('multipart/form-data')
      expect(fileInput).not.toBeNull()
      expect(fileInput.classList.contains('govuk-visually-hidden')).toBe(false)
      expect(page.querySelector('#choose-files-btn')).toBeNull()
      expect(selectedFilesSection).not.toBeNull()
      expect(selectedFilesSection.hasAttribute('hidden')).toBe(true)
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
      expect(page.querySelector('input[name="information-asset-owner"]')).not.toBeNull()
      expect(page.querySelector('form[action="/upload/create-group"]')).not.toBeNull()
    })
  })

  describe('POST /upload/create-group', () => {
    test('returns 400 when name is empty', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload/create-group',
        payload: { name: '   ', description: 'A desc', 'information-asset-owner': '' }
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
        payload: { name: 'New Group', description: 'Desc', 'information-asset-owner': 'owner@example.com' }
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
        payload: { name: 'Dup', description: '', 'information-asset-owner': '' }
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
        payload: { name: 'Test', description: '', 'information-asset-owner': '' }
      })

      expect(response.statusCode).toBe(500)

      const { window } = new JSDOM(response.result)
      const page = window.document
      expect(page.body.textContent).toContain('Failed to create knowledge group')
    })
  })
})
