import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { marked } from 'marked'
import { storeConversation } from './conversation-cache.js'

/**
 * Calls the chat API with a user question and returns the response.
 * Caches the complete conversation after receiving the API response.
 *
 * @param {string} question - The user's question
 * @param {string} modelId - The ID of the AI model to use
 * @param {string} conversationId - Optional conversation ID to continue an existing conversation
 * @returns {Promise<Object>} The API response containing conversationId and messages
 * @throws {Error} If the API request fails
 */
async function sendQuestion (question, modelId, conversationId) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/chat`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question,
        conversation_id: conversationId || null,
        modelId
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

    const parsedMessages = data.messages.map(message => {
      return {
        ...message,
        content: marked.parse(message.content)
      }
    })

    const result = {
      conversationId: data.conversationId,
      messages: parsedMessages
    }

    await storeConversation(result.conversationId, result.messages, modelId)

    return result
  } catch (error) {
    if (error.response) {
      throw error
    }
    throw new Error(`Failed to connect to chat API at ${url}: ${error.message}`)
  }
}

export { sendQuestion }
