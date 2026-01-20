import statusCodes from 'http-status-codes'

import { submitFeedback } from './feedback-api.js'
import { feedbackPostSchema } from './feedback-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import {
  buildFeedbackViewModel,
  buildValidationErrorViewModel,
  buildApiErrorViewModel
} from './feedback-view-models.js'

const FEEDBACK_PATH = 'feedback/feedback'
const SUCCESS_PATH = 'feedback/success'

export const feedbackGetController = {
  async handler (request, h) {
    const logger = createLogger()
    const conversationId = request.query.conversationId || ''

    logger.info({ conversationId }, 'Feedback page accessed')

    return h.view(FEEDBACK_PATH, buildFeedbackViewModel(conversationId))
  }
}

export const feedbackPostController = {
  options: {
    validate: {
      payload: feedbackPostSchema,
      failAction: async (request, h, error) => {
        const viewModel = buildValidationErrorViewModel(request, error)
        return h.view(FEEDBACK_PATH, viewModel).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },

  async handler (request, h) {
    const logger = createLogger()
    const { conversationId, wasHelpful, comment } = request.payload

    try {
      await submitFeedback({ conversationId, wasHelpful, comment })

      logger.info({ conversationId, wasHelpful }, 'Feedback submitted successfully')

      return h.redirect('/feedback/success')
    } catch (error) {
      logger.error({ error, conversationId }, 'Error submitting feedback')
      const viewModel = buildApiErrorViewModel(conversationId, wasHelpful, comment)
      return h.view(FEEDBACK_PATH, viewModel).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const feedbackSuccessController = {
  async handler (_request, h) {
    return h.view(SUCCESS_PATH)
  }
}
