import statusCodes from 'http-status-codes'
import Joi from 'joi'

import { createLogger } from '../common/helpers/logging/logger.js'
import {
  listKnowledgeGroups,
  listDocumentsByKnowledgeGroup,
  createKnowledgeGroup
} from '../services/knowledge-groups-service.js'

const logger = createLogger()

const LIST_PATH = 'knowledge/knowledge'
const GROUP_PATH = 'knowledge/group'
const ADD_GROUP_PATH = 'knowledge/add-group'
const ADD_GROUP_PAGE_TITLE = 'Add knowledge group'
const MAX_NAME_LENGTH = 255
const VALIDATION_FAILED_MESSAGE = 'Validation failed'
const MAX_QUERY_LENGTH = 500
const MAX_QUERY_RESULTS = 20
const DEFAULT_QUERY_RESULTS = 5

function extractErrorDetail (err) {
  return err.detail || err.message
}

function withSnapshotSummaries (snapshots) {
  const arr = Array.isArray(snapshots) ? snapshots : []
  return arr.map(s => {
    const sc = s.source_chunk_counts || {}
    const summary = Object.keys(sc).length > 0
      ? Object.entries(sc).map(([, count]) => `${count}`).join(', ')
      : null
    return { ...s, source_chunk_summary: summary }
  })
}

function buildGroupViewState (group, snapshots, overrides = {}) {
  const sources = group?.sources ? Object.values(group.sources) : []
  return {
    pageTitle: (group?.title || 'Knowledge Group') + ' – Knowledge',
    group: group || { groupId: '', title: 'Unknown', description: '' },
    sources,
    snapshots: withSnapshotSummaries(snapshots),
    errorMessage: null,
    queryResults: null,
    lastQuery: null,
    lastMaxResults: null,
    ...overrides
  }
}

function redirectWithError (groupId, err) {
  return `/knowledge/${groupId}?error=${encodeURIComponent(extractErrorDetail(err))}`
}

export const knowledgeListController = {
  async handler (_request, h) {
    try {
      const raw = await listGroups()
      const groups = (Array.isArray(raw) ? raw : []).map(g => ({
        ...g,
        sourceCount: g.sources ? Object.keys(g.sources).length : 0
      }))
      return h.view(LIST_PATH, {
        pageTitle: 'Knowledge Management',
        groups,
        errorMessage: null
      })
    } catch (err) {
      logger.error({ err }, 'Failed to list knowledge groups')
      return h.view(LIST_PATH, {
        pageTitle: 'Knowledge Management',
        groups: [],
        errorMessage: extractErrorDetail(err)
      }).code(err.status || statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const knowledgeGroupController = {
  async handler (request, h) {
    const { groupId } = request.params
    try {
      const [group, snapshots] = await Promise.all([
        getGroup(groupId),
        listGroupSnapshots(groupId)
      ])
      return h.view(GROUP_PATH, buildGroupViewState(group, snapshots, { request }))
    } catch (err) {
      logger.error({ err, groupId }, 'Failed to load knowledge group')
      return h.view(GROUP_PATH, buildGroupViewState(
        { groupId, title: 'Unknown', description: '' },
        [],
        { pageTitle: 'Knowledge Group – Error', errorMessage: extractErrorDetail(err), request }
      )).code(err.status || statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const knowledgeAddGroupGetController = {
  async handler (_request, h) {
    return h.view(ADD_GROUP_PATH, {
      pageTitle: ADD_GROUP_PAGE_TITLE,
      errorMessage: null,
      values: null
    })
  }
}

export const knowledgeAddGroupPostController = {
  options: {
    validate: {
      payload: Joi.object({
        name: Joi.string().min(1).max(MAX_NAME_LENGTH).required(),
        description: Joi.string().allow('').max(MAX_DESCRIPTION_LENGTH).optional(),
        'information-asset-owner': Joi.string().allow('').max(MAX_NAME_LENGTH).optional()
      }),
      failAction: (_request, h, error) => {
        return h.view(ADD_GROUP_PATH, {
          pageTitle: ADD_GROUP_PAGE_TITLE,
          errorMessage: error.details?.[0]?.message ?? VALIDATION_FAILED_MESSAGE,
          values: _request.payload
        }).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  async handler (request, h) {
    const { name, description, 'information-asset-owner': informationAssetOwner } = request.payload
    try {
      await createKnowledgeGroup({
        name: name.trim(),
        description: description?.trim() || null,
        informationAssetOwner: informationAssetOwner?.trim() || null
      })
      return h.redirect('/knowledge')
    } catch (err) {
      logger.error({ err }, 'Failed to create knowledge group')
      return h.view(ADD_GROUP_PATH, {
        pageTitle: ADD_GROUP_PAGE_TITLE,
        errorMessage: extractErrorDetail(err),
        values: request.payload
      }).code(err.status || statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}
