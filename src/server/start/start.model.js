class StartViewModel {
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
  constructor ({
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
    this.messages = messages
    this.conversationId = conversationId
    this.models = models
    this.modelId = modelId
    this.responsePending = responsePending
    this.errorMessage = errorMessage
    this.errorDetails = errorDetails
    this.question = question
    if (notFound) {
      this.notFound = true
    }
  }
}

export { StartViewModel }
