import { chatService } from '../api-requests/chat-service.js'
import { conversationHistoryService } from '../api-requests/conversation-history-service.js'
import { ChatViewModel } from './view-models.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger('chat-controller')

async function getConversation(conversationId, h) {
  logger.info(`Fetching conversation with ID: ${conversationId}`)

  const conversation = await conversationHistoryService.getConversationHistory(conversationId)

  console.log('Conversation data:', conversation)

  const viewModel = new ChatViewModel(
    conversation
  )

  return h.view('chat/chat', viewModel)
}

export {
  getConversation,
}
