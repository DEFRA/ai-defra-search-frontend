import statusCodes from 'http-status-codes'

import { createLogger } from '../common/helpers/logging/logger.js'
import { listKnowledgeGroups, createKnowledgeGroup } from '../services/knowledge-groups-service.js'

const logger = createLogger()
const UPLOAD_VIEW_PATH = 'upload/upload'
const CREATE_GROUP_VIEW_PATH = 'upload/create-group'
const KNOWLEDGE_GROUP_REQUIRED = 'Select a knowledge group'

async function buildUploadViewState (overrides = {}) {
  let knowledgeGroups = []
  try {
    knowledgeGroups = await listKnowledgeGroups() ?? []
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch knowledge groups for upload page')
  }
  const knowledgeGroupSelectItems = [
    { value: '', text: 'Select a group' },
    ...knowledgeGroups.map(g => ({ value: g.id, text: g.name }))
  ]
  return { knowledgeGroupSelectItems, ...overrides }
}

export const uploadGetController = {
  async handler (_request, h) {
    const viewState = await buildUploadViewState()
    return h.view(UPLOAD_VIEW_PATH, viewState)
  }
}

export const uploadPostController = {
  async handler (request, h) {
    const knowledgeGroupId = request.payload?.['knowledge-group']?.trim?.() ?? ''
    const errorMessage = !knowledgeGroupId ? KNOWLEDGE_GROUP_REQUIRED : null

    const viewState = await buildUploadViewState({
      errorMessage,
      selectedKnowledgeGroup: knowledgeGroupId
    })

    if (errorMessage) {
      return h.view(UPLOAD_VIEW_PATH, viewState).code(statusCodes.BAD_REQUEST)
    }

    return h.view(UPLOAD_VIEW_PATH, viewState)
  }
}

export const uploadCreateGroupGetController = {
  async handler (_request, h) {
    return h.view(CREATE_GROUP_VIEW_PATH, {
      errorMessage: null,
      values: null
    })
  }
}

export const uploadCreateGroupPostController = {
  async handler (request, h) {
    const { name, description, 'information-asset-owner': informationAssetOwner } = request.payload ?? {}
    const values = {
      name: name?.trim?.() ?? '',
      description: description?.trim?.() ?? '',
      'information-asset-owner': informationAssetOwner?.trim?.() ?? ''
    }

    if (!values.name) {
      return h.view(CREATE_GROUP_VIEW_PATH, {
        errorMessage: 'Enter a name for the knowledge group',
        values
      }).code(statusCodes.BAD_REQUEST)
    }

    try {
      await createKnowledgeGroup({
        name: values.name,
        description: values.description || null,
        informationAssetOwner: values['information-asset-owner'] || null
      })
      return h.redirect('/upload')
    } catch (err) {
      logger.warn({ err }, 'Failed to create knowledge group')
      const errorMessage = typeof err.detail === 'string' ? err.detail : 'Failed to create knowledge group'
      return h.view(CREATE_GROUP_VIEW_PATH, {
        errorMessage,
        values
      }).code(err.status || statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}
