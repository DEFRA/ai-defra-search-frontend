import {
  findElement,
  showLoadingIndicator,
  hideLoadingIndicator,
  renderUserMessage,
  renderAssistantMessage,
  renderInlineLoading,
  replaceInlineLoadingWithAssistant,
  replaceInlineLoadingWithError,
  fetchConversation,
  findAssistantMessage,
  postChat,
  setFormDisabled
} from '../common/helpers/chat-helpers.js'

const DEFAULT_POLL_INTERVAL_MS = 1000
const DEFAULT_POLL_MAX_ATTEMPTS = 14
const DEFAULT_POLL_BACKOFF_MULTIPLIER = 1.1
const DEFAULT_POLL_MAX_INTERVAL_MS = 10000
const DEFAULT_POLL_TOTAL_TIMEOUT_MS = 29000

const __chatConfigRuntime = (typeof window !== 'undefined' && window.CHAT_CONFIG) ? window.CHAT_CONFIG : {}
const POLL_INTERVAL_MS = __chatConfigRuntime.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
const POLL_MAX_ATTEMPTS = __chatConfigRuntime.pollMaxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS
const POLL_BACKOFF_MULTIPLIER = __chatConfigRuntime.pollBackoffMultiplier ?? DEFAULT_POLL_BACKOFF_MULTIPLIER
const POLL_MAX_INTERVAL_MS = __chatConfigRuntime.pollMaxIntervalMs ?? DEFAULT_POLL_MAX_INTERVAL_MS
const POLL_TOTAL_TIMEOUT_MS = __chatConfigRuntime.pollTotalTimeoutMs ?? DEFAULT_POLL_TOTAL_TIMEOUT_MS

/**
 * Poll the conversation endpoint until the assistant reply is available or a
 * timeout/attempt limit is reached.
 *
 * @param {string} conversationId - Conversation identifier returned by /api/chat
 * @param {string} userMessageId - The messageId of the user's queued question
 * @returns {Promise<Object|null>} The assistant message object when completed, otherwise null
 */
async function pollForResponse (conversationId, userMessageId) {
  const startTime = Date.now()
  let attempts = 0
  let currentInterval = POLL_INTERVAL_MS

  while (attempts < POLL_MAX_ATTEMPTS) {
    if (Date.now() - startTime >= POLL_TOTAL_TIMEOUT_MS) {
      return null
    }

    attempts++

    await new Promise(resolve => setTimeout(resolve, currentInterval))

    try {
      const conversation = await fetchConversation(conversationId)

      const { userMessageIndex, assistant: possibleAssistantMessage } = findAssistantMessage(conversation, userMessageId)

      if (userMessageIndex === -1) {
        return null
      }

      if (possibleAssistantMessage && possibleAssistantMessage.role === 'assistant' && possibleAssistantMessage.status === 'completed') {
        return possibleAssistantMessage
      }

      currentInterval = Math.min(currentInterval * POLL_BACKOFF_MULTIPLIER, POLL_MAX_INTERVAL_MS)
    } catch (error) {
      // swallow transient errors and retry until max attempts
    }
  }

  return null
}

/**
 * Handle the start form submission when enhanced by JavaScript.
 * Intercepts the submit, sends the question via `POST /api/chat`, renders a
 * local placeholder, polls for the assistant response, then updates the DOM.
 *
 * @param {Event} event - Submit event
 * @param {HTMLFormElement} form - The form being submitted
 */
async function handleFormSubmit (event, form) {
  event.preventDefault()
  const questionTextarea = form.querySelector('#question')
  const modelSelect = form.querySelector('input[name="modelId"]:checked')

  if (!questionTextarea || !modelSelect) return

  const question = questionTextarea.value.trim()
  const modelId = modelSelect.value
  if (!question) return

  const conversationIdMatch = form.action.match(/\/start\/([^/]+)$/)
  const conversationId = conversationIdMatch ? conversationIdMatch[1] : null

  try {
    setFormDisabled(form, true)

    const data = await postChat(question, modelId, conversationId)

    renderUserMessage(question, data.messageId)
    renderInlineLoading(data.messageId)
    questionTextarea.value = ''

    const assistantMessage = await pollForResponse(data.conversationId, data.messageId)

    hideLoadingIndicator()

    if (assistantMessage) {
      replaceInlineLoadingWithAssistant(data.messageId, assistantMessage.content, assistantMessage.modelName, assistantMessage.timestamp)
    } else {
      replaceInlineLoadingWithError(data.messageId, { isRetryable: true })
    }

    if (!conversationId && data.conversationId) {
      window.history.pushState({}, '', `/start/${data.conversationId}`)
    }
  } catch (error) {
    console.error('Error submitting question:', error)
    hideLoadingIndicator()
  } finally {
    setFormDisabled(form, false)
  }
}

/**
 * Attach JS hooks to the start form so submissions are intercepted.
 * If no matching form is present on the page the function is a no-op.
 */
function attachFormHooks () {
  const form = findElement('form[action^="/start"]')

  if (!form) {
    return
  }

  form.addEventListener('submit', (event) => handleFormSubmit(event, form))
}

export { attachFormHooks, showLoadingIndicator, hideLoadingIndicator }
