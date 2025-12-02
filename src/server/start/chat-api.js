import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { marked } from 'marked'

/**
 * Calls the chat API with a user question and returns the response.
 *
 * @param {string} question - The user's question
 * @param {string} modelName - The name of the AI model to use
 * @returns {Promise<Object>} The API response containing conversationId and messages
 * @throws {Error} If the API request fails
 */
async function sendQuestion (question, modelName) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/chat`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question, modelName })
    })

    if (!response.ok) {
      throw new Error(`Chat API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    const parsedMessages = data.messages.map(message => {
      return {
        ...message,
        content: marked.parse(message.content)
      }
    })

    // Transform snake_case to camelCase for conversation_id
    return {
      conversationId: data.conversation_id,
      messages: parsedMessages
    }
  } catch (error) {
    throw new Error(`Failed to connect to chat API at ${url}: ${error.message}`)
  }
}

export { sendQuestion }
