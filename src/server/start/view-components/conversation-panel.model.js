class ConversationPanelModel {
  /**
   * @param {Object} params
   * @param {Array} params.messages
   * @param {string} params.conversationId
   * @param {Object|null} [params.errorDetails]
   */
  constructor ({ messages, conversationId, errorDetails = null }) {
    this.messages = messages
    this.conversationId = conversationId
    this.errorDetails = errorDetails
  }
}

export { ConversationPanelModel }
