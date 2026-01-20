import { formatGdsErrorSummary, formatFieldErrors } from '../common/helpers/validation/format-validation-errors.js'

/**
 * Builds the initial feedback page view model
 * @param {string} conversationId - The conversation ID
 * @returns {Object} The view model for the feedback page
 */
export function buildFeedbackViewModel (conversationId) {
  return {
    conversationId,
    fieldErrors: {}
  }
}

/**
 * Builds the view model for validation errors
 * @param {Object} request - The Hapi request object
 * @param {Object} error - The validation error
 * @returns {Object} The view model for validation errors
 */
export function buildValidationErrorViewModel (request, error) {
  const validationErrors = error.details || []

  return {
    conversationId: request.payload?.conversationId || '',
    wasHelpful: request.payload?.wasHelpful,
    comment: request.payload?.comment,
    errors: formatGdsErrorSummary(validationErrors),
    fieldErrors: formatFieldErrors(validationErrors)
  }
}

/**
 * Builds the view model for API errors
 * @param {string} conversationId - The conversation ID
 * @param {string} wasHelpful - Whether the feedback was helpful
 * @param {string} comment - The feedback comment
 * @returns {Object} The view model for API errors
 */
export function buildApiErrorViewModel (conversationId, wasHelpful, comment) {
  return {
    conversationId,
    wasHelpful,
    comment,
    fieldErrors: {},
    errors: [{
      text: 'There was a problem submitting your feedback. Please try again.',
      href: '#wasHelpful'
    }]
  }
}
