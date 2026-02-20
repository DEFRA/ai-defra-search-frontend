import statusCodes from 'http-status-codes'
import Joi from 'joi'

import { createLogger } from '../common/helpers/logging/logger.js'
import {
  listGroups,
  getGroup,
  listGroupSnapshots,
  createGroup,
  ingestGroup,
  addSourceToGroup,
  removeSourceFromGroup,
  activateSnapshot,
  querySnapshot
} from './knowledge-api.js'

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
        description: Joi.string().min(1).required(),
        owner: Joi.string().min(1).max(MAX_NAME_LENGTH).required(),
        source_name: Joi.string().min(1).max(MAX_NAME_LENGTH).required(),
        source_type: Joi.string().valid('BLOB', 'PRECHUNKED_BLOB').required(),
        source_location: Joi.string().min(1).max(2048).required()
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
    const { name, description, owner, source_name: sourceName, source_type: sourceType, source_location: sourceLocation } = request.payload
    try {
      await createGroup({
        name,
        description,
        owner,
        sources: [{ name: sourceName, type: sourceType, location: sourceLocation }]
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

export const knowledgeIngestController = {
  async handler (request, h) {
    const { groupId } = request.params
    try {
      await ingestGroup(groupId)
      return h.redirect(`/knowledge/${groupId}?ingested=1#ingest`)
    } catch (err) {
      logger.error({ err, groupId }, 'Failed to trigger ingest')
      return h.redirect(redirectWithError(groupId, err))
    }
  }
}

export const knowledgeAddSourceController = {
  options: {
    validate: {
      payload: Joi.object({
        source_name: Joi.string().min(1).max(MAX_NAME_LENGTH).required(),
        source_type: Joi.string().valid('BLOB', 'PRECHUNKED_BLOB').required(),
        source_location: Joi.string().min(1).max(2048).required()
      }),
      failAction: (req, h, error) => {
        return h.redirect(`/knowledge/${req.params.groupId}?addError=${encodeURIComponent(error.details?.[0]?.message ?? VALIDATION_FAILED_MESSAGE)}`).takeover()
      }
    }
  },
  async handler (request, h) {
    const { groupId } = request.params
    const { source_name: sourceName, source_type: sourceType, source_location: sourceLocation } = request.payload
    try {
      await addSourceToGroup(groupId, {
        name: sourceName,
        type: sourceType,
        location: sourceLocation
      })
      return h.redirect(`/knowledge/${groupId}?sourceAdded=1`)
    } catch (err) {
      logger.error({ err, groupId }, 'Failed to add source')
      return h.redirect(redirectWithError(groupId, err))
    }
  }
}

export const knowledgeRemoveSourceController = {
  async handler (request, h) {
    const { groupId, sourceId } = request.params
    try {
      await removeSourceFromGroup(groupId, sourceId)
      return h.redirect(`/knowledge/${groupId}?sourceRemoved=1`)
    } catch (err) {
      logger.error({ err, groupId, sourceId }, 'Failed to remove source')
      return h.redirect(redirectWithError(groupId, err))
    }
  }
}

export const knowledgeActivateSnapshotController = {
  async handler (request, h) {
    const { groupId, snapshotId } = request.params
    try {
      await activateSnapshot(snapshotId)
      return h.redirect(`/knowledge/${groupId}?activated=1`)
    } catch (err) {
      logger.error({ err, snapshotId }, 'Failed to activate snapshot')
      return h.redirect(redirectWithError(groupId, err))
    }
  }
}

export const knowledgeQueryController = {
  options: {
    validate: {
      payload: Joi.object({
        query: Joi.string().min(1).max(MAX_QUERY_LENGTH).required(),
        max_results: Joi.number().integer().min(1).max(MAX_QUERY_RESULTS).default(DEFAULT_QUERY_RESULTS)
      }),
      failAction: (req, h, error) => {
        return h.redirect(`/knowledge/${req.params.groupId}?queryError=${encodeURIComponent(error.details?.[0]?.message ?? VALIDATION_FAILED_MESSAGE)}`).takeover()
      }
    }
  },
  async handler (request, h) {
    const { groupId } = request.params
    const { query, max_results: maxResults } = request.payload
    try {
      const [group, snapshots, queryResults] = await Promise.all([
        getGroup(groupId),
        listGroupSnapshots(groupId),
        querySnapshot(groupId, query, maxResults)
      ])
      return h.view(GROUP_PATH, buildGroupViewState(group, snapshots, {
        request,
        queryResults: Array.isArray(queryResults) ? queryResults : [],
        lastQuery: query,
        lastMaxResults: maxResults
      }))
    } catch (err) {
      logger.error({ err, groupId }, 'Failed to query snapshot')
      return h.redirect(redirectWithError(groupId, err))
    }
  }
}
