import statusCodes from 'http-status-codes'

import { submitFeedback } from './feedback-api.js'
import { feedbackPostSchema } from './feedback-schema.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const FEEDBACK_PATH = 'feedback/feedback'
const SUCCESS_PATH = 'feedback/success'

export const feedbackGetController = {
  async handler (request, h) {
    const logger = createLogger()
    const conversationId = request.query.conversationId || ''

    logger.info({ conversationId }, 'Feedback page accessed')

    return h.view(FEEDBACK_PATH, {
      conversationId,
      fieldErrors: {}
    })
  }
}

export const feedbackPostController = {
  options: {
    validate: {
      payload: feedbackPostSchema,
      failAction: async (request, h, error) => {
        const logger = createLogger()
        const validationErrors = error.details || []

        logger.warn({ errors: validationErrors.map((err) => err.message) }, 'Feedback validation failed')

        const errorSummary = []
        const fieldErrors = {}

        for (const details of validationErrors) {
          const field = details.path[0]
          const message = details.message

          switch (field) {
            case 'wasHelpful':
              errorSummary.push({ text: message, href: '#wasHelpful' })
              fieldErrors.wasHelpful = { text: message }
              break
            case 'comment':
              errorSummary.push({ text: message, href: '#comment' })
              fieldErrors.comment = { text: message }
              break
            default:
              // No action needed for other fields (e.g., conversationId is a hidden input with no UI field error)
          }
        }

        return h.view(FEEDBACK_PATH, {
          conversationId: request.payload?.conversationId || '',
          wasHelpful: request.payload?.wasHelpful,
          comment: request.payload?.comment,
          errors: errorSummary,
          fieldErrors
        }).code(statusCodes.BAD_REQUEST).takeover()
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

      return h.view(FEEDBACK_PATH, {
        conversationId,
        wasHelpful,
        comment,
        fieldErrors: {},
        errors: [{
          text: 'There was a problem submitting your feedback. Please try again.',
          href: '#wasHelpful'
        }]
      }).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

export const feedbackSuccessController = {
  async handler (_request, h) {
    return h.view(SUCCESS_PATH)
  }
}
