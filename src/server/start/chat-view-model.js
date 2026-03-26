import statusCodes from 'http-status-codes'
import { sendQuestion, getConversation as getConversationApi } from '../services/chat-service.js'
import { getModels } from '../services/models-service.js'
import { listKnowledgeGroups } from '../services/knowledge-groups-service.js'
import { getConversation as getCachedConversation, storeConversation, clearConversation } from './conversation-cache.js'
import { hasPendingResponse, buildUserMessage, buildPlaceholderMessage } from './message-builders.js'
import { getErrorDetails } from './error-mapping.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { config } from '../../config/config.js'

/**
 * Determines whether an error represents a request timeout or an abort.
 *
 * @param {Error} error
 * @returns {boolean}
 */
function isTimeoutOrAbort (error) {
  const isTimeout = error.message === 'timeout'
  const isAbort = error.name === 'AbortError' || error.type === 'aborted' || error?.cause?.name === 'AbortError'
  return isTimeout || isAbort
}

/**
 * Clears the initialViewPending flag on a cached conversation after it has been
 * rendered for the first time following a question submission.
 *
 * @param {{ conversationId: string, messages: Array, modelId: string|null }} cached
 * @returns {Promise<void>}
 */
async function clearInitialViewPending (cached) {
  const logger = createLogger()
  try {
    await storeConversation(
      cached.conversationId,
      cached.messages,
      cached.modelId || null,
      { initialViewPending: false }
    )
  } catch (error) {
    logger.error({ err: error, conversationId: cached.conversationId }, 'Failed to clear initialViewPending flag')
  }
}

/**
 * Appends a user message and an assistant placeholder message to the cached
 * conversation immediately after a question is queued, so the UI can show a
 * loading state while polling for the real response.
 *
 * @param {string|undefined} conversationId - The existing conversation ID, if any
 * @param {string} question - The user's question text
 * @param {{ conversationId: string, messageId: string }} apiResponse - The queue response from the chat API
 * @param {string} modelId - The model ID selected by the user
 * @returns {Promise<void>}
 */
async function storeConversationWithPlaceholder (conversationId, question, apiResponse, modelId) {
  const logger = createLogger()
  try {
    const existingConversation = await getCachedConversation(conversationId)
    const existingMessages = existingConversation?.messages || []
    const newUserMessage = buildUserMessage(question, apiResponse.messageId)
    const placeholderAssistantMessage = buildPlaceholderMessage(apiResponse.messageId)
    const updatedMessages = [...existingMessages, newUserMessage, placeholderAssistantMessage]
    await storeConversation(apiResponse.conversationId, updatedMessages, modelId, { initialViewPending: true })
  } catch (error) {
    logger.error({ err: error, conversationId }, 'Failed to store conversation in cache')
  }
}

/**
 * Builds the select item list for the knowledge group dropdown.
 *
 * @param {Array<{ id: string, name: string }>} knowledgeGroups
 * @returns {Array<{ value: string, text: string }>}
 */
function buildKnowledgeGroupSelectItems (knowledgeGroups) {
  return [
    { value: '', text: 'No knowledge group' },
    ...knowledgeGroups.map(g => ({ value: g.id, text: g.name }))
  ]
}

/**
 * Fetches models and knowledge groups concurrently and builds the page resource bundle.
 *
 * @returns {Promise<{ models: Array, knowledgeGroupSelectItems: Array }>}
 */
async function loadSharedPageResources () {
  const [models, knowledgeGroups] = await Promise.all([getModels(), listKnowledgeGroups()])
  return { models, knowledgeGroupSelectItems: buildKnowledgeGroupSelectItems(knowledgeGroups) }
}

/**
 * Returns page data from the initialViewPending cache snapshot and clears the flag.
 * Used on the first render immediately after a question is submitted.
 *
 * @param {{ conversationId: string, messages: Array, modelId: string|null }} cached
 * @param {Array} models
 * @param {Array} knowledgeGroupSelectItems
 * @returns {Promise<object>}
 */
async function resolveFromInitialView (cached, models, knowledgeGroupSelectItems) {
  await clearInitialViewPending(cached)
  return {
    models,
    knowledgeGroupSelectItems,
    messages: cached.messages,
    conversationId: cached.conversationId,
    modelId: cached.modelId || null,
    responsePending: hasPendingResponse(cached.messages)
  }
}

/**
 * Fetches a conversation from the API wrapped in a timeout race.
 * Returns null if the conversation does not exist.
 *
 * @param {string} conversationId
 * @param {number} timeoutMs
 * @returns {Promise<object|null>}
 */
async function fetchConversationWithTimeout (conversationId, timeoutMs) {
  return Promise.race([
    getConversationApi(conversationId, timeoutMs),
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ])
}

/**
 * Persists an API-fetched conversation back to cache, preserving the cached modelId.
 *
 * @param {{ conversationId: string, messages: Array }} conversation
 * @param {string|null} cachedModelId
 * @returns {Promise<void>}
 */
async function syncConversationToCache (conversation, cachedModelId) {
  try {
    await storeConversation(conversation.conversationId, conversation.messages, cachedModelId, { initialViewPending: false })
  } catch (error) {
    createLogger().error({ err: error, conversationId: conversation.conversationId }, 'Failed to update cache with API conversation')
  }
}

/**
 * Fetches conversation data from the API, with fallback to cache on timeout or abort.
 * Returns a not-found state on 404. Throws for unhandled errors.
 *
 * @param {string} conversationId
 * @param {object|null} cached
 * @param {Array} models
 * @param {Array} knowledgeGroupSelectItems
 * @returns {Promise<object>}
 */
async function resolveFromApi (conversationId, cached, models, knowledgeGroupSelectItems) {
  const timeoutMs = config.get('chatApiTimeoutMs')

  try {
    const conversation = await fetchConversationWithTimeout(conversationId, timeoutMs)

    if (!conversation) {
      return { models, knowledgeGroupSelectItems, messages: [], conversationId, modelId: null, responsePending: false }
    }

    await syncConversationToCache(conversation, cached?.modelId ?? null)

    return {
      models,
      knowledgeGroupSelectItems,
      messages: conversation.messages,
      conversationId: conversation.conversationId,
      modelId: cached?.modelId ?? null,
      responsePending: hasPendingResponse(conversation.messages)
    }
  } catch (error) {
    if (isTimeoutOrAbort(error)) {
      const fallbackMessages = cached?.messages ?? []
      return {
        models,
        knowledgeGroupSelectItems,
        messages: fallbackMessages,
        conversationId,
        modelId: cached?.modelId ?? null,
        responsePending: hasPendingResponse(fallbackMessages)
      }
    }
    if (error.response?.status === statusCodes.NOT_FOUND) {
      return { models, knowledgeGroupSelectItems, messages: [], conversationId, modelId: null, responsePending: false, notFound: true }
    }
    throw error
  }
}

/**
 * Loads all data needed to render the conversation page.
 * Uses a cache-first strategy: serves the initialViewPending snapshot immediately
 * after a question is submitted, then falls back to the API for subsequent loads.
 * On timeout or abort, falls back to the cached messages. Throws for unhandled errors.
 *
 * @param {string|undefined} conversationId
 * @returns {Promise<object>}
 */
async function loadConversationPageData (conversationId) {
  const { models, knowledgeGroupSelectItems } = await loadSharedPageResources()

  if (!conversationId) {
    return { models, knowledgeGroupSelectItems, messages: [], conversationId: null, modelId: null, responsePending: false }
  }

  const cached = await getCachedConversation(conversationId)

  if (cached?.initialViewPending) {
    return resolveFromInitialView(cached, models, knowledgeGroupSelectItems)
  }

  return resolveFromApi(conversationId, cached, models, knowledgeGroupSelectItems)
}

/**
 * Checks whether the conversation has a pending response that would conflict with a new submission.
 * Returns conflict data if a conflict exists, otherwise null.
 *
 * @param {string} conversationId
 * @returns {Promise<object|null>}
 */
async function detectPendingConflict (conversationId) {
  const cached = await getCachedConversation(conversationId)
  if (!hasPendingResponse(cached?.messages)) {
    return null
  }
  const [models, knowledgeGroups] = await Promise.all([getModels(), listKnowledgeGroups()])
  return {
    messages: cached.messages,
    models,
    knowledgeGroupSelectItems: buildKnowledgeGroupSelectItems(knowledgeGroups),
    modelId: cached.modelId ?? null
  }
}

/**
 * Submits a question to the chat API and stages a placeholder message in cache.
 * Throws on API error.
 *
 * @param {string} question
 * @param {string} modelId
 * @param {string|undefined} conversationId
 * @param {string|null} [knowledgeGroupId]
 * @returns {Promise<{ conversationId: string }>}
 */
async function submitQuestion (question, modelId, conversationId, knowledgeGroupId) {
  const apiResponse = await sendQuestion(question, modelId, conversationId, knowledgeGroupId)
  await storeConversationWithPlaceholder(conversationId, question, apiResponse, modelId)
  return { conversationId: apiResponse.conversationId }
}

/**
 * Loads data needed to re-render the page after a failed question submission.
 *
 * @param {string} question
 * @param {string} modelId
 * @param {string|undefined} conversationId
 * @param {Error} error
 * @param {string|null} [knowledgeGroupId]
 * @returns {Promise<object>}
 */
async function loadSubmitError (question, modelId, conversationId, error, knowledgeGroupId) {
  const [models, knowledgeGroups, conversation, errorDetails] = await Promise.all([
    getModels(),
    listKnowledgeGroups(),
    getCachedConversation(conversationId),
    getErrorDetails(error)
  ])
  const messages = conversation?.messages || []
  return { messages, question, conversationId, modelId, models, knowledgeGroupSelectItems: buildKnowledgeGroupSelectItems(knowledgeGroups), knowledgeGroupId: knowledgeGroupId || null, errorDetails, responsePending: hasPendingResponse(messages) }
}

/**
 * Loads data needed to re-render the page after a Joi validation failure.
 *
 * @param {string|undefined} conversationId
 * @param {string} question
 * @param {string} modelId
 * @param {string} errorMessage
 * @param {string|null} [knowledgeGroupId]
 * @returns {Promise<object>}
 */
async function loadValidationError (conversationId, question, modelId, errorMessage, knowledgeGroupId) {
  const [models, knowledgeGroups, conversation] = await Promise.all([
    getModels(),
    listKnowledgeGroups(),
    getCachedConversation(conversationId)
  ])
  const messages = conversation?.messages || []
  return { messages, question, conversationId, modelId, models, knowledgeGroupSelectItems: buildKnowledgeGroupSelectItems(knowledgeGroups), knowledgeGroupId: knowledgeGroupId || null, errorMessage, responsePending: hasPendingResponse(messages) }
}

/**
 * Clears the conversation from cache.
 *
 * @param {string} conversationId
 * @returns {Promise<void>}
 */
async function resetConversation (conversationId) {
  await clearConversation(conversationId)
}

export { loadConversationPageData, detectPendingConflict, submitQuestion, loadSubmitError, loadValidationError, resetConversation }
