class BaseViewModel {
  constructor() {
    this.pageTitle = 'AI DEFRA Search'
    this.serviceName = 'AI DEFRA Search'
    this.phaseTag = 'Beta'
    this.phaseTagText =
      'This is a new service - your feedback will help us to improve it.'
  }
}

class ChatViewModel extends BaseViewModel {
  constructor(conversation) {
    super()
    this.pageTitle = 'Conversation History - AI DEFRA Search'
    this.heading = 'Conversation History'
    this.conversationHistory = conversation.messages || []
    this.conversationId = conversation.conversationId
    this.tokenUsage = conversation.tokenUsage || []

    this.tokenUsage.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }
}

export { ChatViewModel }
