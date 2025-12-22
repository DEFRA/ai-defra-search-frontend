import statusCodes from 'http-status-codes'

import { sendQuestion } from './chat-api.js'
import { getModels } from './models-api.js'
import { startPostSchema } from './chat-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'

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
      failAction: async (request, h, error) => {
        const errorMessage = error.details[0]?.message

        let models = []
        models = await getModels()

        return h.view(END_POINT_PATH, {
          question: request.payload?.question,
          modelId: request.payload?.modelId,
          models,
          errorMessage
        }).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  async handler (request, h) {
    const logger = createLogger()

    logger.info({ modelId: request.payload.modelId }, 'Processing user question submission')

    const { modelId, question } = request.payload

    let models = []

    try {
      models = await getModels()
      const response = await sendQuestion(question, modelId)

      return h.view(END_POINT_PATH, {
        messages: response.messages,
        conversationId: response.conversationId,
        modelId,
        models
      })
    } catch (error) {
      logger.error({ error, question }, 'Error calling chat API')

      return h.view(END_POINT_PATH, {
        question,
        modelId,
        models,
        errorMessage: 'Sorry, there was a problem getting a response. Please try again.'
      })
    }
  }
}

export const clearConversationController = {
  handler (_request, h) {
    const logger = createLogger()
    logger.info('Clear conversation requested')

    // TODO: Call downstream service to clear conversation when available
    // For now, just redirect to start page which will show a fresh form
    logger.info('Conversation cleared, redirecting to start page')
    return h.redirect('/start')
  }
}
