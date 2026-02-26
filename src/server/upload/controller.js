import statusCodes from 'http-status-codes'

import { createLogger } from '../common/helpers/logging/logger.js'
import { listKnowledgeGroups } from '../services/knowledge-groups-service.js'
import { config } from '../../config/config.js'

const logger = createLogger()
const UPLOAD_VIEW_PATH = 'upload/upload'
const DEMO_USER_ID = '12345678-aaaa-bbbb-cccc-000000000001'
const KNOWLEDGE_GROUP_REQUIRED = 'Select a knowledge group'

async function buildUploadViewState (request, overrides = {}) {
  let knowledgeGroups = []
  const userId = config.get('auth.enabled')
    ? request.auth?.credentials?.id
    : DEMO_USER_ID
  try {
    knowledgeGroups = await listKnowledgeGroups(userId) ?? []
  } catch (err) {
    logger.warn({ err, userId }, 'Failed to fetch knowledge groups for upload page')
  }
  const knowledgeGroupSelectItems = [
    { value: '', text: 'Select a group' },
    ...knowledgeGroups.map(g => ({ value: g.id, text: g.name }))
  ]
  return { knowledgeGroupSelectItems, ...overrides }
}

export const uploadGetController = {
  async handler (request, h) {
    const viewState = await buildUploadViewState(request)
    return h.view(UPLOAD_VIEW_PATH, viewState)
  }
}

export const uploadPostController = {
  async handler (request, h) {
    const knowledgeGroupId = request.payload?.['knowledge-group']?.trim?.() ?? ''
    const errorMessage = !knowledgeGroupId ? KNOWLEDGE_GROUP_REQUIRED : null

    const viewState = await buildUploadViewState(request, {
      errorMessage,
      selectedKnowledgeGroup: knowledgeGroupId
    })

    if (errorMessage) {
      return h.view(UPLOAD_VIEW_PATH, viewState).code(statusCodes.BAD_REQUEST)
    }

    return h.view(UPLOAD_VIEW_PATH, viewState)
  }
}
