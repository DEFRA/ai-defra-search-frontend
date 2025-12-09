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
      logger.error({ error }, 'Error calling chat API')
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
          modelName: request.payload?.modelName,
          models,
          errorMessage
        }).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  async handler (request, h) {
    const logger = createLogger()
    const { modelName, question } = request.payload

    let models = []

    try {
      models = await getModels()
      // Call the chat API with the user's question and selected model
      const response = await sendQuestion(question, modelName)

      // Re-render the page with the response
      return h.view(END_POINT_PATH, {
        messages: response.messages,
        conversationId: response.conversationId,
        modelName,
        models
      })
    } catch (error) {
      logger.error({ error, question }, 'Error calling chat API')

      return h.view(END_POINT_PATH, {
        question,
        modelName,
        models,
        errorMessage: 'Sorry, there was a problem getting a response. Please try again.'
      })
    }
  }
}

export const clearConversationController = {
  handler (request, h) {
    const logger = createLogger()
    logger.info('Clear conversation requested')

    // TODO: Call downstream service to clear conversation when available
    // await conversationService.clear(request.yar.get('conversationId'))

    // For now, just redirect to start page which will show a fresh form
    logger.info('Conversation cleared, redirecting to start page')
    return h.redirect('/start')
  }
}

