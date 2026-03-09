/**
 * @param {Object} params
 * @param {Array} [params.messages]
 * @param {string|null} [params.conversationId]
 * @param {Array} params.models
 * @param {string|null} [params.modelId]
 * @param {boolean} [params.responsePending]
 * @param {string|null} [params.errorMessage]
 * @param {Object|null} [params.errorDetails]
 * @param {string|null} [params.question]
 * @param {boolean} [params.notFound]
 */
function createStartViewModel ({
  messages = [],
  conversationId = null,
  models,
  modelId = null,
  responsePending = false,
  errorMessage = null,
  errorDetails = null,
  question = null,
  notFound = false
}) {
  const model = {
    messages,
    conversationId,
    models,
    modelId,
    responsePending,
    errorMessage,
    errorDetails,
    question
  }
  if (notFound) {
    model.notFound = true
  }
  return model
}

export { createStartViewModel }
