import {EventSource} from 'eventsource'
import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { marked } from 'marked'
import { storeConversation } from './conversation-cache.js'
import statusCodes from 'http-status-codes'
import { createLogger } from '../common/helpers/logging/logger.js'
import sanitizeHtml from 'sanitize-html'

export { sendQuestion }

const SSE_TIMEOUT_MS = 2 * 60 * 1000
const SSE_KEEPALIVE_TIMEOUT_MS = 90 * 1000
const SSE_KEEPALIVE_CHECK_MS = 10 * 1000

/**
 * Creates an SSE-specific error with additional context.
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} data - Additional error data
 * @returns {Error}
 */
function createSSEError (message, status, data) {
  const error = new Error(message)
  error.status = status
  error.data = data
  error.response = {
    status,
    data
  }
  return error
}

function camelizeKeys (input) {
  if (Array.isArray(input)) return input.map(camelizeKeys)
  if (input && typeof input === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(input)) {
      const camelKey = k.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
      out[camelKey] = camelizeKeys(v)
    }
    return out
  }
  return input
}

/**
 * Sends a question to the chat API using POST-then-GET pattern.
 * First POSTs the question and gets message/conversation IDs,
 * then opens an EventSource to stream status updates.
 * Resolves with the completed conversation payload (keys are camelCased).
 * @param {string} question
 * @param {string} modelId
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
async function sendQuestion (question, modelId, conversationId) {
  const chatApiUrl = config.get('chatApiUrl')
  const postUrl = `${chatApiUrl}/chat`
  const logger = createLogger()

  // Step 1: POST the question and get IDs
  const postResponse = await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversationId: conversationId || null, modelId })
  })

  if (!postResponse.ok) {
    const errorBody = await postResponse.text().catch(() => '')
    const error = createSSEError(
      `Chat API returned ${postResponse.status}`,
      postResponse.status,
      { errorBody }
    )
    throw error
  }

  const postData = await postResponse.json()
  const messageId = postData.message_id || postData.messageId
  const resultConversationId = postData.conversation_id || postData.conversationId

  if (!messageId) {
    throw createSSEError(
      'Chat API did not return message_id',
      statusCodes.BAD_GATEWAY,
      { postData }
    )
  }

  // Step 2: Open EventSource to stream status updates
  return new Promise((resolve, reject) => {
    let lastEventTime = Date.now()
    let isResolved = false
    let eventSource = null

    const overallTimer = setTimeout(() => {
      if (!isResolved && eventSource) {
        eventSource.close()
        const error = createSSEError(
          'Request timeout: No response received within time limit',
          statusCodes.REQUEST_TIMEOUT,
          { messageId, conversationId: resultConversationId }
        )
        reject(error)
      }
    }, SSE_TIMEOUT_MS)

    const keepAliveTimer = setInterval(() => {
      if (Date.now() - lastEventTime > SSE_KEEPALIVE_TIMEOUT_MS && !isResolved && eventSource) {
        eventSource.close()
        const error = createSSEError(
          'Keep-alive timeout: No events received within time limit',
          statusCodes.REQUEST_TIMEOUT,
          { messageId, conversationId: resultConversationId }
        )
        reject(error)
      }
    }, SSE_KEEPALIVE_CHECK_MS)

    const cleanupTimers = () => {
      clearTimeout(overallTimer)
      clearInterval(keepAliveTimer)
      if (eventSource) {
        try { eventSource.close() } catch (e) {}
      }
    }

    const streamUrl = `${chatApiUrl}/chat/stream/${messageId}`
    eventSource = new EventSource(streamUrl)

    eventSource.addEventListener('status', (event) => {
      lastEventTime = Date.now()
      if (isResolved) return

      let payload
      try {
        payload = JSON.parse(event.data)
      } catch (err) {
        try {
          logger.warn({ err: err.message, eventSize: event.data ? event.data.length : 0 }, 'SSE payload parse failed')
        } catch (e) {}
        return
      }

      const status = payload.status || payload.state
      if (status === 'completed' || status === 'done') {
        isResolved = true
        cleanupTimers()

        const raw = payload.result || payload
        const result = camelizeKeys(raw)
        if (Array.isArray(result.messages)) {
          result.messages = result.messages.map((m) => {
            const content = m.content || m.text || ''
            const rendered = marked(String(content))
            const safe = sanitizeHtml(rendered)
            return Object.assign({}, m, { text: String(content), content: safe })
          })
        }
        if (result.conversationId) {
          storeConversation(result.conversationId, result.messages || [], modelId).catch((cacheErr) => {
            try {
              logger.error({ err: cacheErr.message, conversationId: result.conversationId }, 'Failed to write conversation cache')
            } catch (e) {}
          })
        }
        resolve(result)
      } else if (status === 'failed' || status === 'error') {
        isResolved = true
        cleanupTimers()
        reject(createSSEError(
          payload.error_message || payload.error || 'SSE reported failure',
          statusCodes.BAD_GATEWAY,
          payload
        ))
      }
    })

    eventSource.addEventListener('keepalive', () => {
      lastEventTime = Date.now()
    })

    eventSource.addEventListener('error', (err) => {
      if (isResolved) return
      isResolved = true
      cleanupTimers()

      const error = createSSEError(
        'EventSource connection error',
        statusCodes.BAD_GATEWAY,
        { message: err.message || String(err), messageId, conversationId: resultConversationId }
      )
      if (err && typeof err === 'object') {
        error.status = err.status || statusCodes.BAD_GATEWAY
        error.data = err.data || error.data
      }
      reject(error)
    })
  })
}
 
