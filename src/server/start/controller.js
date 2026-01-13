import statusCodes from 'http-status-codes'

import { sendQuestion } from './chat-api.js'
import { getErrorDetails } from './error-mapping.js'
import { getModels } from './models-api.js'
import { startPostSchema, startParamsSchema } from './chat-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { getConversation, clearConversation } from './conversation-cache.js'

const END_POINT_PATH = 'start/start'

export const startGetController = {
  async handler (_request, h) {
    const logger = createLogger()
    try {
      const models = await getModels()
      return h.view(END_POINT_PATH, { models })
    } catch (error) {
      logger.error(error, 'Error calling chat API')
      return h.view('error/index', {
        pageTitle: 'Something went wrong',
        heading: statusCodes.INTERNAL_SERVER_ERROR,
        message: 'Sorry, there was a problem with the service request'
      }).code(statusCodes.INTERNAL_SERVER_ERROR)
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
        const conversationId = request.params.conversationId

        const models = await getModels()
        const conversation = await getConversation(conversationId)
        const messages = conversation?.messages || []

        return h.view(END_POINT_PATH, {
          question: request.payload?.question,
          conversationId,
          modelId: request.payload?.modelId,
          models,
          messages,
          errorMessage
        }).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  async handler (request, h) {
    const logger = createLogger()

    logger.info({ modelId: request.payload.modelId }, 'Processing user question submission')

    const { modelId, question } = request.payload
    const conversationId = request.params.conversationId

    let models = []

    try {
      models = await getModels()
      const response = await sendQuestion(question, modelId, conversationId)

      return h.view(END_POINT_PATH, {
        messages: response.messages,
        conversationId: response.conversationId,
        modelId,
        models
      })
    } catch (error) {
      logger.error({ error, question }, 'Error calling chat API')

      const conversation = await getConversation(conversationId)
      const messages = conversation?.messages || []
      const errorDetails = await getErrorDetails(error)

      return h.view(END_POINT_PATH, {
        messages,
        question,
        conversationId,
        modelId,
        models,
        errorDetails
      })
    }
  }
}

export const clearConversationController = {
  async handler (request, h) {
    const conversationId = request.params.conversationId

    if (conversationId) {
      await clearConversation(conversationId)
    }

    return h.redirect('/start')
  }
}
