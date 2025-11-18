import statusCodes from 'http-status-codes'

import { sendQuestion } from './chat-api.js'
import { getModels } from './models-api.js'
import { startPostSchema } from './chat-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const END_POINT_PATH = 'start/start'

export const startGetController = {
  async handler (request, h) {
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
      failAction: (request, h, error) => {
        const errorMessage = error.details[0]?.message

        return h.view(END_POINT_PATH, {
          question: request.payload?.question,
          errorMessage
        }).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  async handler (request, h) {
    const logger = createLogger()
    const { question } = request.payload

    try {
      // Call the chat API with the user's question
      const response = await sendQuestion(question)

      // Re-render the page with the response
      return h.view(END_POINT_PATH, {
        messages: response.messages,
        conversationId: response.conversationId
      })
    } catch (error) {
      logger.error({ error, question }, 'Error calling chat API')

      // Re-render the page with the question and error message
      return h.view(END_POINT_PATH, {
        question,
        errorMessage: 'Sorry, there was a problem getting a response. Please try again.'
      })
    }
  }
}
