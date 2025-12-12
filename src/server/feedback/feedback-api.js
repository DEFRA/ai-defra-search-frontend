import fetch from 'node-fetch'

import { config } from '../../config/config.js'

/**
 * Submits user feedback about an AI response.
 *
 * @param {Object} feedback - The feedback data
 * @param {string} feedback.conversationId - The conversation ID
 * @param {string} feedback.wasHelpful - Whether the response was helpful (yes/no)
 * @param {string} feedback.comment - Optional user comment
 * @returns {Promise<void>}
 * @throws {Error} If the API request fails
 */
async function submitFeedback ({ conversationId, wasHelpful, comment }) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/feedback`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: conversationId || null,
        was_helpful: wasHelpful ? wasHelpful === 'yes' : null,
        comment: comment || null
      })
    })

    if (!response.ok) {
      throw new Error(`Feedback API returned ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    throw new Error(`Failed to submit feedback to API at ${url}: ${error.message}`)
  }
}

export { submitFeedback }
