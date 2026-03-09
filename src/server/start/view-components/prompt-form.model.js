class PromptFormModel {
  /**
   * @param {Object} params
   * @param {string|null} [params.conversationId]
   * @param {string|null} [params.question]
   * @param {boolean} [params.responsePending]
   * @param {Array} params.models
   * @param {string|null} [params.modelId]
   */
  constructor ({ conversationId = null, question = null, responsePending = false, models, modelId = null }) {
    this.conversationId = conversationId
    this.question = question
    this.responsePending = responsePending
    this.models = models
    this.modelId = modelId
  }
}

export { PromptFormModel }
