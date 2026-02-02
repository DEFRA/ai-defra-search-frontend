import statusCodes from 'http-status-codes'
import { marked } from 'marked'

import { sendQuestion, getConversation as getConversationApi } from './chat-api.js'
import { getModels } from './models-api.js'
import { startPostSchema, startParamsSchema } from './chat-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { getConversation as getCachedConversation, storeConversation, clearConversation } from './conversation-cache.js'
import {
  buildServerErrorViewModel,
  buildValidationErrorViewModel,
  buildApiErrorViewModel
} from './chat-view-models.js'

const START_VIEW_PATH = 'start/start'
const CONVERSATION_VIEW_PATH = 'start/conversation'

export const startGetController = {
  async handler (_request, h) {
    const logger = createLogger()
    try {
      const models = await getModels()
      return h.view(START_VIEW_PATH, { models })
    } catch (error) {
      logger.error(error, 'Error calling chat API')
      return h.view('error/index', buildServerErrorViewModel()).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const startPostController = {
  options: {
    validate: {
      payload: startPostSchema,
      params: startParamsSchema,
      failAction: async (request, h, error) => {
        const errorMessage = error.details[0]?.message
        const viewModel = await buildValidationErrorViewModel(request, errorMessage)
        return h.view(START_VIEW_PATH, viewModel).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  /**
   * Submits user question to the agent and redirects to the conversation view.
   * The backend queues the request and returns identifiers for deep-linking.
   * Supports no-JS flow by caching the user message for immediate display.
   */
  async handler (request, h) {
    const logger = createLogger()
    const { modelId, question } = request.payload
    const conversationId = request.params.conversationId

    try {
      const response = await sendQuestion(question, modelId, conversationId)
      const id = response.conversationId

      logger.info({ conversationId: id, messageId: response.messageId }, 'Question submitted, redirecting to conversation')

      try {
        const existingConversation = await getCachedConversation(id)
        const existingMessages = existingConversation?.messages || []
        
        const newUserMessage = {
          role: 'user',
          content: marked.parse(question),
          message_id: response.messageId,
          timestamp: new Date().toISOString()
        }
        
        const updatedMessages = [...existingMessages, newUserMessage]
        await storeConversation(id, updatedMessages, modelId, { initialViewPending: true })
      } catch (err) {
        logger.error({ err, conversationId: id }, 'Failed to store conversation in cache')
      }

      return h.redirect(`/conversations/${id}`).code(statusCodes.SEE_OTHER)
    } catch (error) {
      logger.error({ error, question }, 'Error calling chat API')
      const models = await getModels()
      const viewModel = await buildApiErrorViewModel(conversationId, question, modelId, models, error)
      return h.view(START_VIEW_PATH, viewModel)
    }
  }
}

export const conversationGetController = {
  /**
   * Displays the conversation view.
   * On first load after redirect, shows cached user question immediately.
   * On manual refresh, fetches completed conversation from API.
   */
  async handler (request, h) {
    const logger = createLogger()
    const conversationId = request.params.conversationId

    try {
      const models = await getModels()
      const cached = await getCachedConversation(conversationId)

      if (cached?.initialViewPending) {
        ;(async () => {
          try {
            await storeConversation(
              cached.conversationId,
              cached.messages,
              cached.modelId || null,
              { initialViewPending: false }
            )
          } catch (bgErr) {
            logger.error({ bgErr, conversationId }, 'Failed to clear initialViewPending flag')
          }
        })()

        return h.view(CONVERSATION_VIEW_PATH, {
          messages: cached.messages,
          conversationId: cached.conversationId,
          models,
          modelId: cached.modelId || null
        })
      }

      try {
        const timeoutMs = 1000
        const conversation = await Promise.race([
          getConversationApi(conversationId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ])

        if (!conversation) {
          return h.view(CONVERSATION_VIEW_PATH, { conversationId, messages: [], models, modelId: null })
        }

        try {
          await storeConversation(
            conversation.conversationId,
            conversation.messages,
            null,
            { initialViewPending: false }
          )
        } catch (cacheErr) {
          logger.error({ cacheErr, conversationId }, 'Failed to update cache with API conversation')
        }

        return h.view(CONVERSATION_VIEW_PATH, {
          messages: conversation.messages,
          conversationId: conversation.conversationId,
          models,
          modelId: null
        })
      } catch (err) {
        if (err.message === 'timeout') {
          return h.view(CONVERSATION_VIEW_PATH, { conversationId, messages: [], models, modelId: null })
        }
        if (err.response && err.response.status === 404) {
          return h.view(CONVERSATION_VIEW_PATH, { conversationId, messages: [], notFound: true, models, modelId: null }).code(statusCodes.NOT_FOUND)
        }
        throw err
      }
    } catch (error) {
      logger.error({ error, conversationId }, 'Error fetching conversation from chat API')
      if (error.response && error.response.status === 404) {
        const models = await getModels()
        return h.view(CONVERSATION_VIEW_PATH, { conversationId, messages: [], notFound: true, models, modelId: null }).code(statusCodes.NOT_FOUND)
      }
      return h.view('error/index', buildServerErrorViewModel()).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const clearConversationController = {
  /**
   * Clears the conversation cache and redirects to the start page.
   */
  async handler (request, h) {
    const conversationId = request.params.conversationId

    if (conversationId) {
      await clearConversation(conversationId)
    }

    return h.redirect('/start')
  }
}
