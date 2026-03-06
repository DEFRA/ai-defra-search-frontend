import { config } from '../../config/config.js'
import { marked } from 'marked'
import { getUserId } from '../common/helpers/user-context.js'
import { fetchWithTimeout } from '../common/helpers/fetch-with-timeout.js'

/**
 * Send a question to the backend chat API. The backend queues the request and
 * returns identifiers (conversation_id, message_id) rather than the full
 * message content. This function returns the identifiers so the caller can
 * redirect to a conversation view.
 *
 * @param {string} question - The user's question
 * @param {string} modelId - The ID of the AI model to use
 * @param {string} conversationId - Optional conversation ID to continue an existing conversation
 * @returns {Promise<Object>} An object containing `conversationId`, `messageId` and `status`
 * @throws {Error} If the API request fails
 */
async function sendQuestion (question, modelId, conversationId) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/chat`
  const timeoutMs = config.get('chatApiTimeoutMs')

  try {
    const userId = getUserId()
    const headers = { 'Content-Type': 'application/json' }
    if (userId) {
      headers['user-id'] = userId
    }

    const response = await fetchWithTimeout(url, timeoutMs, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        conversation_id: conversationId || null,
        model_id: modelId
      })
    })

    if (!response.ok) {
      const errorBody = await response.json()
      const error = new Error(`Chat API returned ${response.status}`)
      error.response = {
        status: response.status,
        data: errorBody
      }

      throw error
    }

    const data = await response.json()

    return {
      conversationId: data.conversation_id || data.conversationId,
      messageId: data.message_id || data.messageId,
      status: data.status
    }
  } catch (error) {
    if (error.response) {
      throw error
    }
    throw new Error(`Failed to connect to chat API at ${url}: ${error.message}`)
  }
}

/**
 * Retrieve a conversation from the backend chat API and parse message
 * markdown into HTML for server-side rendering.
 *
 * @param {string} conversationId - UUID of the conversation
 * @param {number} timeoutMs - Timeout in milliseconds (defaults to configured chatApiTimeoutMs)
 * @returns {Promise<Object>} The conversation object { conversationId, messages }
 */
async function getConversation (conversationId, timeoutMs = config.get('chatApiTimeoutMs')) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/conversations/${conversationId}`

  const userId = getUserId()
  const headers = userId ? { 'user-id': userId } : {}
  const response = await fetchWithTimeout(url, timeoutMs, { headers })
  if (!response.ok) {
    const error = new Error(`Chat API returned ${response.status}`)
    error.response = { status: response.status, data: await response.text() }
    throw error
  }

  const data = await response.json()

  const parsedMessages = (data.messages || []).map(message => ({
    ...message,
    content: message.content ? marked.parse(message.content) : ''
  }))

  return {
    conversationId: data.conversation_id || data.conversationId,
    messages: parsedMessages
  }
}

export { sendQuestion, getConversation }
