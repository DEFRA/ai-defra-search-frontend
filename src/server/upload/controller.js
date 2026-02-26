import statusCodes from 'http-status-codes'

import { createLogger } from '../common/helpers/logging/logger.js'
import { listKnowledgeGroups, createKnowledgeGroup } from '../services/knowledge-groups-service.js'
import { config } from '../../config/config.js'

const logger = createLogger()
const UPLOAD_VIEW_PATH = 'upload/upload'
const CREATE_GROUP_VIEW_PATH = 'upload/create-group'
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

function getUserId (request) {
  return config.get('auth.enabled')
    ? request.auth?.credentials?.id
    : DEMO_USER_ID
}

export const uploadCreateGroupGetController = {
  async handler (request, h) {
    return h.view(CREATE_GROUP_VIEW_PATH, {
      errorMessage: null,
      values: null
    })
  }
}

export const uploadCreateGroupPostController = {
  async handler (request, h) {
    const { name, description } = request.payload ?? {}
    const userId = getUserId(request)
    const values = { name: name?.trim?.() ?? '', description: description?.trim?.() ?? '' }

    if (!values.name) {
      return h.view(CREATE_GROUP_VIEW_PATH, {
        errorMessage: 'Enter a name for the knowledge group',
        values
      }).code(statusCodes.BAD_REQUEST)
    }

    try {
      await createKnowledgeGroup(userId, { name: values.name, description: values.description || null })
      return h.redirect('/upload')
    } catch (err) {
      logger.warn({ err, userId }, 'Failed to create knowledge group')
      const errorMessage = typeof err.detail === 'string' ? err.detail : 'Failed to create knowledge group'
      return h.view(CREATE_GROUP_VIEW_PATH, {
        errorMessage,
        values
      }).code(err.status || statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}
