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
const MAX_DESCRIPTION_LENGTH = 2000
const VALIDATION_FAILED_MESSAGE = 'Validation failed'

function extractErrorDetail (err) {
  return err.detail || err.message
}

function mapGroupToView (g) {
  return {
    groupId: g.id,
    title: g.name,
    description: g.description ?? '',
    owner: g.information_asset_owner ?? ''
  }
}

export const knowledgeListController = {
  async handler (_request, h) {
    try {
      const raw = await listKnowledgeGroups()
      const groups = (Array.isArray(raw) ? raw : []).map(g => mapGroupToView(g))
      const groupsWithCount = await Promise.all(
        groups.map(async (g) => {
          try {
            const docs = await listDocumentsByKnowledgeGroup(g.groupId)
            return { ...g, sourceCount: Array.isArray(docs) ? docs.length : 0 }
          } catch {
            return { ...g, sourceCount: 0 }
          }
        })
      )
      return h.view(LIST_PATH, {
        pageTitle: 'Knowledge Management',
        groups: groupsWithCount,
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
      const [allGroups, documents] = await Promise.all([
        listKnowledgeGroups(),
        listDocumentsByKnowledgeGroup(groupId)
      ])
      const group = (Array.isArray(allGroups) ? allGroups : []).find(g => g.id === groupId)
      if (!group) {
        return h.view(GROUP_PATH, {
          pageTitle: 'Knowledge Group – Error',
          group: { groupId, title: 'Unknown', description: '' },
          documents: [],
          errorMessage: 'Knowledge group not found',
          request
        }).code(statusCodes.NOT_FOUND)
      }
      const viewGroup = {
        ...mapGroupToView(group),
        groupId: group.id
      }
      return h.view(GROUP_PATH, {
        pageTitle: `${viewGroup.title} – Knowledge`,
        group: viewGroup,
        documents: Array.isArray(documents) ? documents : [],
        errorMessage: null,
        request
      })
    } catch (err) {
      logger.error({ err, groupId }, 'Failed to load knowledge group')
      return h.view(GROUP_PATH, {
        pageTitle: 'Knowledge Group – Error',
        group: { groupId, title: 'Unknown', description: '' },
        documents: [],
        errorMessage: extractErrorDetail(err),
        request
      }).code(err.status || statusCodes.INTERNAL_SERVER_ERROR)
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
