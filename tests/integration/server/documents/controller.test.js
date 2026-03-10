import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'
import { vi } from 'vitest'

import { createServer } from '../../../../src/server/server.js'
import {
  listKnowledgeGroups,
  listDocumentsByKnowledgeGroup
} from '../../../../src/server/services/knowledge-groups-service.js'

vi.mock('../../../../src/server/services/knowledge-groups-service.js')

describe('Documents page', () => {
  let server

  beforeAll(async () => {
    vi.mocked(listKnowledgeGroups).mockResolvedValue([])
    vi.mocked(listDocumentsByKnowledgeGroup).mockResolvedValue([])
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    vi.mocked(listKnowledgeGroups).mockResolvedValue([])
    vi.mocked(listDocumentsByKnowledgeGroup).mockResolvedValue([])
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /documents', () => {
    test('displays the documents page with knowledge group dropdown', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documents'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      expect(page.body.textContent).toContain('Documents')
      expect(page.body.textContent).toContain('Knowledge group')
      expect(page.querySelector('select#group')).not.toBeNull()
      expect(page.querySelector('button[type="submit"]')).not.toBeNull()
    })

    test('populates knowledge group dropdown when API returns groups', async () => {
      vi.mocked(listKnowledgeGroups).mockResolvedValue([
        { id: 'kg1', name: 'My Group' },
        { id: 'kg2', name: 'Another Group' }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/documents'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document
      const select = page.querySelector('select#group')
      expect(select?.querySelector('option[value="kg1"]')).toBeTruthy()
      expect(select?.querySelector('option[value="kg2"]')).toBeTruthy()
    })

    test('shows documents table when group is selected', async () => {
      vi.mocked(listKnowledgeGroups).mockResolvedValue([
        { id: 'kg1', name: 'My Group' }
      ])
      vi.mocked(listDocumentsByKnowledgeGroup).mockResolvedValue([
        {
          id: 'doc1',
          file_name: 'guide.pdf',
          status: 'ready',
          knowledge_group_id: 'kg1',
          cdp_upload_id: 'up-1',
          s3_key: 'uploads/kg1/guide.pdf',
          created_at: '2025-03-05T12:00:00Z',
          chunk_count: 12
        }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/documents?group=kg1'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      expect(page.body.textContent).toContain('My Group')
      expect(page.body.textContent).toContain('guide.pdf')
      expect(page.body.textContent).toContain('ready')
      expect(page.body.textContent).toContain('12')
      expect(page.querySelector('table.govuk-table')).not.toBeNull()
    })

    test('shows error when listDocumentsByKnowledgeGroup fails', async () => {
      vi.mocked(listKnowledgeGroups).mockResolvedValue([{ id: 'kg1', name: 'My Group' }])
      vi.mocked(listDocumentsByKnowledgeGroup).mockRejectedValue(new Error('API error'))

      const response = await server.inject({
        method: 'GET',
        url: '/documents?group=kg1'
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)
      const { window } = new JSDOM(response.result)
      expect(window.document.body.textContent).toMatch(/problem|error|failed/i)
    })
  })
})
