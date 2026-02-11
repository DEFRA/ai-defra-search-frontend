import { getModels } from './models-api.js'
import { getConversation } from './conversation-cache.js'
import { getErrorDetails } from './error-mapping.js'

/**
 * Builds the error view model for server errors
 * @returns {Object} The view model for the error page
 */
function buildServerErrorViewModel () {
  return {
    pageTitle: 'Something went wrong',
    heading: 500,
    message: 'Sorry, there was a problem with the service request'
  }
}

/**
 * Builds the view model for validation errors
 * Handles fetching models and conversation data internally
 * @param {Object} request - The Hapi request object
 * @param {string} errorMessage - The validation error message
 * @returns {Promise<Object>} The view model for validation errors
 */
async function buildValidationErrorViewModel (request, errorMessage) {
  const { conversationId } = request.params
  const { question, modelId } = request.payload || {}

  const models = await getModels()
  const conversation = await getConversation(conversationId)
  const messages = conversation?.messages || []

  return {
    question,
    conversationId,
    modelId,
    models,
    messages,
    errorMessage
  }
}

/**
 * Builds the view model for successful chat response
 * @param {Object} response - The API response containing messages and conversationId
 * @param {string} modelId - The model ID
 * @param {Array} models - The list of available models
 * @returns {Object} The view model for successful response
 */
function buildChatSuccessViewModel (response, modelId, models) {
  return {
    messages: response.messages,
    conversationId: response.conversationId,
    modelId,
    models
  }
}

/**
 * Builds the view model for API errors
 * Handles fetching conversation and error details internally
 * @param {string} conversationId - The conversation ID
 * @param {string} question - The user's question
 * @param {string} modelId - The model ID
 * @param {Array} models - The list of available models
 * @param {Error} error - The error from the API
 * @returns {Promise<Object>} The view model for API errors
 */
async function buildApiErrorViewModel (conversationId, question, modelId, models, error) {
  const conversation = await getConversation(conversationId)
  const messages = conversation?.messages || []
  const errorDetails = await getErrorDetails(error)

  return {
    messages,
    question,
    conversationId,
    modelId,
    models,
    errorDetails
  }
}

export { buildServerErrorViewModel, buildValidationErrorViewModel, buildChatSuccessViewModel, buildApiErrorViewModel }
