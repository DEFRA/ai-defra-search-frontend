import statusCodes from 'http-status-codes'

import { sendQuestion } from './chat-api.js'
import { getModels } from './models-api.js'
import { startPostSchema } from './chat-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const END_POINT_PATH = 'start/start'

export const startGetController = {
  async handler (request, h) {
    const logger = createLogger()

    // Check if we need to process form data from session
    const formData = request.yar.get('formData')
    const shouldShowLoading = request.yar.get('showLoading')

    if (formData && shouldShowLoading) {
      // Clear the loading flag
      request.yar.clear('showLoading')

      const { modelName, question } = formData
      let models = []

      try {
        models = await getModels()
        // Call the chat API with the user's question and selected model
        const response = await sendQuestion(question, modelName)

        // Clear session data
        request.yar.clear('formData')

        // Re-render the page with the response
        return h.view(END_POINT_PATH, {
          messages: response.messages,
          conversationId: response.conversationId,
          modelName,
          models
        })
      } catch (error) {
        logger.error({ error, question }, 'Error calling chat API')

        // Clear session data
        request.yar.clear('formData')

        return h.view(END_POINT_PATH, {
          question,
          modelName,
          models,
          errorMessage: 'Sorry, there was a problem getting a response. Please try again.'
        })
      }
    }

    // Normal GET request - just show the form
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
    const { modelName, question } = request.payload

    // Store form data in session to process on next GET
    request.yar.set('formData', { modelName, question })
    request.yar.set('showLoading', true)

    // Get models and show loading spinner
    const models = await getModels()
    return h.view(END_POINT_PATH, {
      showLoading: true,
      models,
      question,
      modelName
    })
  }
}
