import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { marked } from 'marked'
import { storeConversation } from './conversation-cache.js'
import statusCodes from 'http-status-codes'
import { createLogger } from '../common/helpers/logging/logger.js'

function createSimpleSSEParser (onEvent) {
  let buffer = ''
  return {
    feed (chunk) {
      buffer += chunk
      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() || ''
      for (const part of parts) {
        if (!part.trim()) continue
        const lines = part.split(/\r?\n/)
        let eventName = null
        const dataLines = []
        for (const line of lines) {
          const idx = line.indexOf(':')
          if (idx === -1) continue
          const field = line.slice(0, idx).trim()
          const value = line.slice(idx + 1).replace(/^\s?/, '')
          if (field === 'data') dataLines.push(value)
          else if (field === 'event') eventName = value
        }
        onEvent({ type: 'event', event: eventName || 'message', data: dataLines.join('\n') })
      }
    }
  }
}

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
  // Expose status and data as enumerable properties for structured logging
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
 * Sends a question to the chat API and consumes the SSE response until completion.
 * Resolves with the completed conversation payload (keys are camelCased).
 * @param {string} question
 * @param {string} modelId
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
async function sendQuestion (question, modelId, conversationId) {
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/chat`

  return new Promise(async (resolve, reject) => {
    const controller = new AbortController()
    const signal = controller.signal

    let lastEventTime = Date.now()
    let messageId = null
    let resultConversationId = null
    let isResolved = false

    const overallTimer = setTimeout(() => {
      if (!isResolved) {
        controller.abort()
        const error = createSSEError(
          'Request timeout: No response received within time limit',
          statusCodes.REQUEST_TIMEOUT,
          { messageId, conversationId: resultConversationId }
        )
        reject(error)
      }
    }, SSE_TIMEOUT_MS)

    const keepAliveTimer = setInterval(() => {
      if (Date.now() - lastEventTime > SSE_KEEPALIVE_TIMEOUT_MS && !isResolved) {
        controller.abort()
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
      try { controller.abort() } catch (e) {}
    }

    const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' }

    const body = JSON.stringify({ question, conversationId: conversationId || null, modelId })

    try {
      const response = await fetch(url, { method: 'POST', headers, body, signal })
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        cleanupTimers()
        const error = createSSEError(`Chat API returned ${response.status}`, response.status, { errorBody })
        reject(error)
        return
      }

      lastEventTime = Date.now()

      const logger = createLogger()

      const parser = createSimpleSSEParser((event) => {
        if (event.type === 'event') {
          lastEventTime = Date.now()
          if (!event.data) return
          try {
            const payload = JSON.parse(event.data)
            const status = payload.status || payload.state
            if (status === 'completed' || status === 'done') {
              if (!isResolved) {
                isResolved = true
                cleanupTimers()
                const raw = payload.result || payload
                const result = camelizeKeys(raw)
                if (Array.isArray(result.messages)) {
                  result.messages = result.messages.map((m) => {
                    const content = m.content || m.text || ''
                    const rendered = marked(String(content))
                    return Object.assign({}, m, { text: String(content), content: rendered })
                  })
                }
                if (result.conversationId) {
                  storeConversation(result.conversationId, result.messages || [], modelId).catch((cacheErr) => {
                    try { logger.error({ err: cacheErr.message, conversationId: result.conversationId }, 'Failed to write conversation cache') } catch (e) {}
                  })
                }

                resolve(result)
              }
            } else if (status === 'failed' || status === 'error') {
              if (!isResolved) {
                isResolved = true
                cleanupTimers()
                const err = createSSEError(payload.error_message || payload.error || 'SSE reported failure', statusCodes.BAD_GATEWAY, payload)
                reject(err)
              }
            }
          } catch (err) {
            try { logger.warn({ err: err.message, eventSize: event.data ? event.data.length : 0 }, 'SSE payload parse failed') } catch (e) {}
          }
        }
      })

      // Support both WHATWG ReadableStream (getReader) and Node.js Readable (async iterator)
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          lastEventTime = Date.now()
          const chunk = Buffer.from(value).toString('utf8')
          parser.feed(chunk)
        }
      } else if (response.body && typeof response.body[Symbol.asyncIterator] === 'function') {
        for await (const chunkPart of response.body) {
          lastEventTime = Date.now()
          const chunk = Buffer.isBuffer(chunkPart) ? chunkPart.toString('utf8') : String(chunkPart)
          parser.feed(chunk)
        }
      } else {
        // Fallback: read full text
        const text = await response.text().catch(() => '')
        if (text) parser.feed(text)
      }

      if (!isResolved) {
        isResolved = true
        cleanupTimers()
        const err = createSSEError('SSE stream ended before completion', statusCodes.BAD_GATEWAY, { messageId, conversationId: resultConversationId })
        reject(err)
      }
    } catch (err) {
      if (!isResolved) {
        isResolved = true
        cleanupTimers()
        // Ensure the error carries a status and data for the frontend logger/view
        if (err && typeof err === 'object') {
          err.status = err.status || statusCodes.BAD_GATEWAY
          err.data = err.data || { message: err.message || String(err) }
        }
        reject(err)
      }
    }
  })
}
 
