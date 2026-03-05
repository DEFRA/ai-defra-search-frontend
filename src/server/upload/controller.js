import statusCodes from 'http-status-codes'

import { createLogger } from '../common/helpers/logging/logger.js'
import { listKnowledgeGroups, createKnowledgeGroup, createDocuments } from '../services/knowledge-groups-service.js'
import { initiateUpload } from '../services/cdp-uploader-service.js'

const logger = createLogger()
const UPLOAD_VIEW_PATH = 'upload/upload'
const FILE_UPLOAD_VIEW_PATH = 'upload/file-upload'
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
    const knowledgeGroupId = request.payload?.['knowledge-group']?.trim() ?? ''

    if (!knowledgeGroupId) {
      const viewState = await buildUploadViewState({
        errorMessage: KNOWLEDGE_GROUP_REQUIRED,
        selectedKnowledgeGroup: knowledgeGroupId
      })
      return h.view(UPLOAD_VIEW_PATH, viewState).code(statusCodes.BAD_REQUEST)
    }

    try {
      const { uploadId } = await initiateUpload({ knowledgeGroupId })
      return h.redirect(`/upload/files/${uploadId}`)
    } catch (err) {
      logger.warn({ err }, 'Failed to initiate upload session')
      const viewState = await buildUploadViewState({
        errorMessage: 'Failed to start upload. Please try again.',
        selectedKnowledgeGroup: knowledgeGroupId
      })
      return h.view(UPLOAD_VIEW_PATH, viewState).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const uploadFileGetController = {
  async handler (request, h) {
    const { uploadId } = request.params
    const uploadUrl = `/upload-and-scan/${uploadId}`
    return h.view(FILE_UPLOAD_VIEW_PATH, { uploadUrl })
  }
}

export const uploadCallbackController = {
  options: {
    auth: false
  },
  async handler (request, h) {
    const { uploadReference } = request.params
    logger.info({ uploadReference }, 'uploadCallbackController triggered')
    logger.info({ payload: JSON.stringify(request.payload) }, 'uploadCallbackController payload')
    const { metadata, form } = request.payload

    const formFiles = Object.values(form).flat()

    const completeFiles = formFiles.filter(value => typeof value === 'object' && value !== null && value.fileStatus === 'complete')
    const rejectedFiles = formFiles.filter(value => typeof value === 'object' && value !== null && value.fileStatus === 'rejected')

    logger.info({ completeFiles: completeFiles.map(f => f.filename), rejectedFiles: rejectedFiles.map(f => f.filename) }, 'uploadCallbackController files')

    if (rejectedFiles.length > 0) {
      logger.warn({ uploadReference, rejectedFiles }, 'Files rejected during upload scan')
    }

    if (completeFiles.length > 0) {
      const documents = completeFiles.map(file => ({
        file_name: file.filename,
        knowledge_group_id: metadata.knowledgeGroupId,
        cdp_upload_id: uploadReference,
        status: 'uploaded',
        s3_key: file.s3Key
      }))

      try {
        await createDocuments(documents)
      } catch (err) {
        logger.warn({ err, uploadReference }, 'Failed to create documents in knowledge service')
      }
    }

    return h.response().code(statusCodes.OK)
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
