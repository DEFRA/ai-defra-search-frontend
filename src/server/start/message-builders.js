import { marked } from 'marked'

const PLACEHOLDER_MESSAGE = 'AI agent is responding, refresh to see latest response'

const hasPendingResponse = (messages) => messages?.some(m => m.isPlaceholder) ?? false

/**
 * Build a user message object for storing in the conversation cache
 * @param {string} question
 * @param {string} messageId
 */
function buildUserMessage (question, messageId) {
  return {
    role: 'user',
    content: marked.parse(question),
    message_id: messageId,
    timestamp: new Date().toISOString(),
    status: 'completed'
  }
}

/**
 * Build a placeholder assistant message used for no-JS flow
 * @param {string} [messageId]
 */
function buildPlaceholderMessage (messageId = null) {
  return {
    role: 'assistant',
    content: marked.parse(PLACEHOLDER_MESSAGE),
    message_id: messageId,
    timestamp: new Date().toISOString(),
    status: 'pending',
    isPlaceholder: true
  }
}

export { PLACEHOLDER_MESSAGE, hasPendingResponse, buildUserMessage, buildPlaceholderMessage }
