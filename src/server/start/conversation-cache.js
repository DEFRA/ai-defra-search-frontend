import { createLogger } from '../common/helpers/logging/logger.js'
import { config } from '../../config/config.js'

let cacheInstance = null
let cacheTtl = null

/**
 * Initializes the conversation cache with the server instance.
 * This should be called once when the server starts.
 *
 * @param {object} server - The Hapi server instance
 */
function initializeCache (server) {
  cacheInstance = server.app.cache
  cacheTtl = config.get('session.cache.ttl')
}

/**
 * Gets the cache instance. Throws if not initialized.
 *
 * @returns {object} The cache instance
 */
function getCache () {
  if (!cacheInstance) {
    throw new Error('Conversation cache not initialized. Call initializeCache(server) first.')
  }
  return cacheInstance
}

/**
 * Generates a cache key for a conversation.
 *
 * @param {string} conversationId - The conversation ID
 * @returns {string} The cache key
 */
function getCacheKey (conversationId) {
  return `conversation:${conversationId}`
}

/**
 * Stores a conversation in the cache with TTL.
 *
 * @param {string} conversationId - The conversation ID
 * @param {Array} messages - The conversation messages
 * @param {string} modelId - The model ID used
 * @returns {Promise<void>}
 */
async function storeConversation (conversationId, messages, modelId) {
  const logger = createLogger()
  const cache = getCache()

  try {
    const key = getCacheKey(conversationId)
    const value = {
      conversationId,
      messages,
      modelId,
      updatedAt: new Date().toISOString()
    }

    await cache.set(key, value, cacheTtl)
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to store conversation in cache')
  }
}

/**
 * Retrieves a conversation from the cache.
 *
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<object|null>} The cached conversation or null if not found
 */
async function getConversation (conversationId) {
  const logger = createLogger()
  const cache = getCache()

  if (!conversationId) {
    return null
  }

  try {
    const key = getCacheKey(conversationId)
    const cached = await cache.get(key)

    if (cached) {
      return cached
    }

    return null
  } catch (error) {
    logger.error({ error, conversationId }, 'Error retrieving conversation from cache')
    return null
  }
}

/**
 * Retrieves conversation messages from the cache.
 *
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Array>} The messages array or empty array if not found
 */
async function getConversationMessages (conversationId) {
  const cachedConversation = await getConversation(conversationId)
  return cachedConversation?.messages || []
}

/**
 * Clears a conversation from the cache.
 *
 * @param {string} conversationId - The conversation ID to clear
 * @returns {Promise<void>}
 */
async function clearConversation (conversationId) {
  const logger = createLogger()
  const cache = getCache()

  if (!conversationId) {
    return
  }

  try {
    const key = getCacheKey(conversationId)
    await cache.drop(key)
  } catch (error) {
    logger.error({ error, conversationId }, 'Error clearing conversation from cache')
  }
}

export { initializeCache, storeConversation, getConversation, getConversationMessages, clearConversation }
