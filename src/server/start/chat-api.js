import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { marked } from 'marked'
import { storeConversation } from './conversation-cache.js'
import statusCodes from 'http-status-codes'

// SSE Configuration
const SSE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes max timeout
const SSE_KEEPALIVE_TIMEOUT_MS = 90 * 1000 // 90 seconds (backend sends every 60s)
const SSE_KEEPALIVE_CHECK_MS = 10 * 1000 // Check every 10s

/**
 * Creates an SSE-specific error with additional context.
 * Uses the same error structure as other API calls for Grafana compatibility.
 *
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} data - Additional error data
 * @returns {Error} Enhanced error object
 */
function createSSEError (message, status, data) {
  const error = new Error(message)
  error.response = {
    status,
    data
  }
  return error
}

/**
 * Initiates chat request and handles SSE stream response.
 * Waits for status progression: queued -> processing -> completed/failed
 *
 * @param {string} question - The user's question
 * @param {string} modelId - The ID of the AI model to use
 * @param {string} conversationId - Optional conversation ID to continue an existing conversation
 * @returns {Promise<Object>} The complete conversation when processing completes
 * @throws {Error} If the request fails, times out, or backend returns failed status
 */
async function sendQuestion (question, modelId, conversationId) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/chat`

  return new Promise(async (resolve, reject) => {
    let response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify({
          question,
          conversationId: conversationId || null,
          modelId
        })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        const error = createSSEError(
          `Chat API returned ${response.status}`,
          response.status,
          { errorBody }
        )
        reject(error)
        return
      }
    } catch (fetchError) {
      const error = createSSEError(
        `Failed to connect to chat API: ${fetchError.message}`,
        statusCodes.INTERNAL_SERVER_ERROR,
        { originalError: fetchError }
      )
      reject(error)
      return
    }

    // Parse SSE stream manually using Node.js streams
    let lastEventTime = Date.now()
    let messageId = null
    let resultConversationId = null
    let buffer = ''
    let isResolved = false
    let streamClosed = false

    const cleanup = () => {
      clearTimeout(overallTimeout)
      clearInterval(keepAliveCheck)
      if (!streamClosed) {
        streamClosed = true
        response.body.destroy()
      }
    }

    // Overall timeout
    const overallTimeout = setTimeout(() => {
      if (!isResolved) {
        cleanup()
        const error = createSSEError(
          'Request timeout: No response received within time limit',
          statusCodes.REQUEST_TIMEOUT,
          { messageId, conversationId: resultConversationId }
        )
        reject(error)
      }
    }, SSE_TIMEOUT_MS)

    // Keepalive timeout
    const keepAliveCheck = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTime
      if (timeSinceLastEvent > SSE_KEEPALIVE_TIMEOUT_MS && !isResolved) {
        cleanup()
        const error = createSSEError(
          'Keep-alive timeout: No events received within time limit',
          statusCodes.REQUEST_TIMEOUT,
          { messageId, conversationId: resultConversationId }
        )
        reject(error)
      }
    }, SSE_KEEPALIVE_CHECK_MS)

    // Process SSE stream data events
    response.body.on('data', (chunk) => {
      lastEventTime = Date.now()
      const chunkStr = chunk.toString()
      buffer += chunkStr

      // SSE events are separated by \r\n\r\n or \n\n (handle both)
      const lines = buffer.split(/\r?\n\r?\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        // Match event and data fields, handling \r\n or \n line endings
        const eventMatch = line.match(/^event:\s*(.+?)(?:\r?\n|$)/m)
        const dataMatch = line.match(/^data:\s*(.+?)(?:\r?\n|$)/m)

        if (!eventMatch || !dataMatch) continue

        const eventType = eventMatch[1]
        const eventData = dataMatch[1]

        if (eventType === 'status') {
          try {
            const data = JSON.parse(eventData)
            const status = data.status
            messageId = data.message_id
            resultConversationId = data.conversation_id

            // minimal: process status events without extra logging

            if (status === 'completed') {
              if (isResolved) return
              isResolved = true
              cleanup()

              if (!data.result || !data.result.messages) {
                const error = createSSEError(
                  'Invalid completion event: missing result data',
                  statusCodes.INTERNAL_SERVER_ERROR,
                  data
                )
                reject(error)
                return
              }

              const parsedMessages = data.result.messages.map((message) => ({
                ...message,
                content: marked.parse(message.content)
              }))

              const result = {
                conversationId: data.result.conversation_id,
                messages: parsedMessages
              }

              storeConversation(result.conversationId, result.messages, modelId)
                .then(() => resolve(result))
                .catch(() => resolve(result))
            } else if (status === 'failed') {
              if (isResolved) return
              isResolved = true
              cleanup()

              const error = createSSEError(
                data.error_message || 'Chat processing failed',
                data.error_code || statusCodes.INTERNAL_SERVER_ERROR,
                data
              )
              reject(error)
            }
          } catch (parseError) {
            // parsing failed for this event — continue to next
          }
        }
      }
    })

    // Handle stream errors
    response.body.on('error', (error) => {
      if (isResolved) return
      isResolved = true
      cleanup()
      const sseError = createSSEError(
        `SSE stream error: ${error.message}`,
        statusCodes.INTERNAL_SERVER_ERROR,
        { errorMessage: error.message, errorStack: error.stack, messageId, conversationId: resultConversationId }
      )
      reject(sseError)
    })

    // Handle stream end
    response.body.on('end', () => {
      cleanup()
      if (!isResolved) {
        isResolved = true
        const error = createSSEError(
          'SSE stream ended unexpectedly without completion status',
          statusCodes.INTERNAL_SERVER_ERROR,
          { messageId, conversationId: resultConversationId }
        )
        reject(error)
      }
    })
  })
}

export { sendQuestion }
