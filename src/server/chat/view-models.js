import { marked } from 'marked'

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
    this.conversationId = conversation.conversationId
    this.tokenUsage = conversation.tokenUsage || []

    this.conversationHistory = conversation.messages?.map((m) => {
      return {
        ...m,
        contentHtml: marked.parse(m.content),
        sources: m.sources?.reduce((acc, src) => {
          const exists = acc.find((s) => s.url === src.url)

          if (!exists) {
            acc.push(src)
          }

          return acc
        }, [])
      }
    })

    this.tokenUsage.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    )
  }
}

export { ChatViewModel }
