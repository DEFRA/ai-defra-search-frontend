import statusCodes from 'http-status-codes'

import { createLogger } from '../common/helpers/logging/logger.js'
import { listKnowledgeGroups, createKnowledgeGroup, createDocuments } from '../services/knowledge-groups-service.js'
import { initiateUpload, fetchUploadStatus } from '../services/cdp-uploader-service.js'
import { storeUploadSession, getUploadSession } from './upload-session-cache.js'

const logger = createLogger()
const UPLOAD_VIEW_PATH = 'upload/upload'
const FILE_UPLOAD_VIEW_PATH = 'upload/file-upload'
const CREATE_GROUP_VIEW_PATH = 'upload/create-group'
const UPLOAD_STATUS_VIEW_PATH = 'upload/upload-status'
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
      const { uploadId, statusUrl, uploadReference } = await initiateUpload({ knowledgeGroupId })
      await storeUploadSession(uploadReference, { uploadId, statusUrl, knowledgeGroupId })
      return h.redirect(`/upload/files/${uploadReference}`)
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
    const { uploadReference } = request.params
    const session = await getUploadSession(uploadReference)

    if (!session) {
      return h.response().code(statusCodes.NOT_FOUND)
    }

    const uploadUrl = `/upload-and-scan/${session.uploadId}`
    return h.view(FILE_UPLOAD_VIEW_PATH, { uploadUrl, uploadStatusUrl: `/upload-status/${uploadReference}` })
  }
}

export const uploadStatusGetController = {
  async handler (request, h) {
    const { uploadReference } = request.params
    const session = await getUploadSession(uploadReference)

    if (!session) {
      return h.response().code(statusCodes.NOT_FOUND)
    }

    let uploadStatus = null
    let fileRows = []
    let errorMessage = null

    try {
      const status = await fetchUploadStatus(session.statusUrl)
      uploadStatus = status.uploadStatus
      fileRows = Object.values(status.form ?? {})
        .flat()
        .filter(f => typeof f === 'object' && f !== null)
        .map(f => [
          { text: f.filename },
          { text: f.fileId },
          { text: f.fileStatus }
        ])
    } catch (err) {
      logger.warn({ err, uploadReference }, 'Failed to fetch upload status')
      errorMessage = 'Unable to retrieve upload status. Please try again.'
    }

    return h.view(UPLOAD_STATUS_VIEW_PATH, {
      uploadReference,
      uploadStatus,
      fileRows,
      errorMessage
    })
  }
}

export const uploadCallbackController = {
  options: {
    auth: false
  },
  async handler (request, h) {
    const { uploadReference } = request.params
    const { metadata, form } = request.payload
    logger.info({ uploadReference, uploadStatus: request.payload.uploadStatus }, 'CDP upload callback')

    const formEntries = Object.entries(form)

    const completeFiles = formEntries
      .filter(([, value]) => typeof value === 'object' && value !== null && value.fileStatus === 'complete')
      .map(([, value]) => value)

    const rejectedFiles = formEntries
      .filter(([, value]) => typeof value === 'object' && value !== null && value.fileStatus === 'rejected')
      .map(([, value]) => value)

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
