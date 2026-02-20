import statusCodes from 'http-status-codes'
import { sendQuestion, getConversation as getConversationApi } from './chat-api.js'
import { getModels } from './models-api.js'
import { startPostSchema, startParamsSchema } from './chat-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { getConversation as getCachedConversation, storeConversation, clearConversation } from './conversation-cache.js'
import { config } from '../../config/config.js'
import {
  buildServerErrorViewModel,
  buildValidationErrorViewModel,
  buildApiErrorViewModel,
  buildUserMessage,
  buildPlaceholderMessage,
  hasPendingResponse
} from './chat-view-models.js'

const START_VIEW_PATH = 'start/start'

function buildStartViewState (opts) {
  const { messages = [], conversationId, models, modelId = null, responsePending = false, notFound = false } = opts
  return { messages, conversationId, models, modelId, responsePending, ...(notFound && { notFound: true }) }
}

async function clearInitialViewPending (cached, logger, conversationId) {
  try {
    await storeConversation(
      cached.conversationId,
      cached.messages,
      cached.modelId || null,
      { initialViewPending: false }
    )
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to clear initialViewPending flag')
  }
}

function isTimeoutOrAbort (error) {
  const isTimeout = error.message === 'timeout'
  const isAbort = error.name === 'AbortError' || error.type === 'aborted' || error?.cause?.name === 'AbortError'
  return isTimeout || isAbort
}

const startGetController = {
  /**
   * Handles both initial page load and conversation display.
   * If no conversationId: shows empty form with model selection.
   * If conversationId: displays conversation with cached or API data.
   */
  async handler (request, h) {
    const logger = createLogger()
    const conversationId = request.params.conversationId

    try {
      const models = await getModels()

      if (!conversationId) {
        return h.view(START_VIEW_PATH, { models, responsePending: false })
      }

      const cached = await getCachedConversation(conversationId)

      if (cached?.initialViewPending) {
        await clearInitialViewPending(cached, logger, conversationId)
        return h.view(START_VIEW_PATH, buildStartViewState({
          messages: cached.messages,
          conversationId: cached.conversationId,
          models,
          modelId: cached.modelId || null,
          responsePending: hasPendingResponse(cached.messages)
        }))
      }

      try {
        const timeoutMs = config.get('chatApiTimeoutMs')
        const conversation = await Promise.race([
          getConversationApi(conversationId, timeoutMs),
          new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ])

        if (!conversation) {
          return h.view(START_VIEW_PATH, buildStartViewState({ conversationId, models }))
        }

        try {
          await storeConversation(
            conversation.conversationId,
            conversation.messages,
            null,
            { initialViewPending: false }
          )
        } catch (error) {
          logger.error({ error, conversationId }, 'Failed to update cache with API conversation')
        }

        return h.view(START_VIEW_PATH, buildStartViewState({
          messages: conversation.messages,
          conversationId: conversation.conversationId,
          models,
          responsePending: hasPendingResponse(conversation.messages)
        }))
      } catch (error) {
        if (isTimeoutOrAbort(error)) {
          const fallbackMessages = cached?.messages ?? []
          return h.view(START_VIEW_PATH, buildStartViewState({
            conversationId,
            messages: fallbackMessages,
            models,
            modelId: cached?.modelId ?? null,
            responsePending: hasPendingResponse(fallbackMessages)
          }))
        }
        if (error.response?.status === statusCodes.NOT_FOUND) {
          return h.view(START_VIEW_PATH, buildStartViewState({ conversationId, models, notFound: true }))
            .code(statusCodes.NOT_FOUND)
        }
        throw error
      }
    } catch (error) {
      logger.error({ error, conversationId }, 'Error fetching conversation')
      if (error.response?.status === statusCodes.NOT_FOUND) {
        const models = await getModels()
        return h.view(START_VIEW_PATH, buildStartViewState({ conversationId, models, notFound: true }))
          .code(statusCodes.NOT_FOUND)
      }
      return h.view('error/index', buildServerErrorViewModel()).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

async function checkPendingResponseConflict (conversationId, modelId, h) {
  const cached = await getCachedConversation(conversationId)
  if (!hasPendingResponse(cached?.messages)) {
    return null
  }

  const models = await getModels()
  return h.view(START_VIEW_PATH, {
    messages: cached.messages,
    conversationId,
    models,
    modelId: cached?.modelId ?? modelId,
    responsePending: true,
    errorMessage: 'Please wait for the current response before sending another question.'
  }).code(statusCodes.CONFLICT)
}

async function storeConversationWithPlaceholder (id, question, response, modelId, logger) {
  try {
    const existingConversation = await getCachedConversation(id)
    const existingMessages = existingConversation?.messages || []
    const newUserMessage = buildUserMessage(question, response.messageId)
    const placeholderAssistantMessage = buildPlaceholderMessage(response.messageId)
    const updatedMessages = [...existingMessages, newUserMessage, placeholderAssistantMessage]
    await storeConversation(id, updatedMessages, modelId, { initialViewPending: true })
  } catch (error) {
    logger.error({ error, conversationId: id }, 'Failed to store conversation in cache')
  }
}

const startPostController = {
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

    if (conversationId) {
      const conflictResponse = await checkPendingResponseConflict(conversationId, modelId, h)
      if (conflictResponse) {
        return conflictResponse
      }
    }

    try {
      const response = await sendQuestion(question, modelId, conversationId)
      const id = response.conversationId

      logger.info({ conversationId: id, messageId: response.messageId }, 'Question submitted, redirecting to conversation')

      await storeConversationWithPlaceholder(id, question, response, modelId, logger)

      return h.redirect(`/start/${id}`).code(statusCodes.SEE_OTHER)
    } catch (error) {
      logger.error({ error, question }, 'Error calling chat API')
      const models = await getModels()
      const viewModel = await buildApiErrorViewModel(conversationId, question, modelId, models, error)
      return h.view(START_VIEW_PATH, viewModel)
    }
  }
}

const clearConversationController = {
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

export { startGetController, startPostController, clearConversationController }
