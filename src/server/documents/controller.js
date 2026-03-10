import statusCodes from 'http-status-codes'

import { createLogger } from '../common/helpers/logging/logger.js'
import { listKnowledgeGroups, listDocumentsByKnowledgeGroup } from '../services/knowledge-groups-service.js'

const logger = createLogger()
const VIEW_PATH = 'documents/documents'

async function buildViewState (overrides = {}) {
  let knowledgeGroups = []
  try {
    knowledgeGroups = await listKnowledgeGroups() ?? []
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch knowledge groups for documents page')
  }
  const knowledgeGroupSelectItems = [
    { value: '', text: 'Select a knowledge group' },
    ...knowledgeGroups.map(g => ({ value: g.id, text: g.name }))
  ]
  return {
    pageTitle: 'Documents',
    knowledgeGroupSelectItems,
    documents: [],
    selectedGroupId: '',
    ...overrides
  }
}

export const documentsGetController = {
  async handler (request, h) {
    const selectedGroupId = request.query?.group ?? ''
    const viewState = await buildViewState({ selectedGroupId })

    if (!selectedGroupId) {
      return h.view(VIEW_PATH, viewState)
    }

    try {
      const raw = await listDocumentsByKnowledgeGroup(selectedGroupId)
      const documents = (Array.isArray(raw) ? raw : []).map(d => ({
        ...d,
        created_at_display: d.created_at
          ? new Date(d.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
          : null
      }))
      const selectedGroup = viewState.knowledgeGroupSelectItems.find(
        i => i.value === selectedGroupId
      )
      return h.view(VIEW_PATH, {
        ...viewState,
        documents,
        selectedGroupName: selectedGroup?.text ?? selectedGroupId
      })
    } catch (err) {
      logger.warn({ err, selectedGroupId }, 'Failed to fetch documents')
      return h.view(VIEW_PATH, {
        ...viewState,
        errorMessage: err.message ?? 'Failed to load documents',
        documents: []
      }).code(err.status ?? statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}
