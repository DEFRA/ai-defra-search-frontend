/**
 * Find an element in the document by selector.
 * @param {string} selector - CSS selector.
 * @returns {Element|null}
 */
function findElement (selector) {
  return document.querySelector(selector)
}

/**
 * Show the global AI loading status and reveal any loading indicator.
 */
function showLoadingIndicator () {
  const statusElement = findElement('#ai-status')
  const loadingElement = findElement('#loading-indicator')

  if (statusElement) {
    statusElement.textContent = 'AI assistant is generating a response'
  }

  if (loadingElement) {
    loadingElement.hidden = false
  }
}

/**
 * Hide the global AI loading status and any loading indicator.
 */
function hideLoadingIndicator () {
  const statusElement = findElement('#ai-status')
  const loadingElement = findElement('#loading-indicator')

  if (statusElement) {
    statusElement.textContent = ''
  }

  if (loadingElement) {
    loadingElement.hidden = true
  }
}

/**
 * Render the user's question into the conversation container.
 * @param {string} question
 * @param {string} messageId
 */
function renderUserMessage (question, messageId) {
  const conversationContainer = findElement('.app-conversation-container')

  if (!conversationContainer) {
    return
  }

  const userMessageWrapper = document.createElement('div')
  userMessageWrapper.className = 'app-user-question-wrapper'
  userMessageWrapper.dataset.messageId = messageId

  const userMessage = document.createElement('div')
  userMessage.className = 'app-user-question'
 
  const userMessageP = document.createElement('p')
  userMessageP.textContent = question
  userMessage.appendChild(userMessageP)

  const timestamp = document.createElement('p')
  timestamp.className = 'govuk-body-s govuk-!-text-align-right govuk-!-margin-top-0'
  const now = new Date()
  const timeString = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
  timestamp.innerHTML = `<strong>You</strong> at ${timeString}`

  userMessageWrapper.appendChild(userMessage)
  conversationContainer.appendChild(userMessageWrapper)
  conversationContainer.appendChild(timestamp)

  const placeholder = document.createElement('div')
  placeholder.className = 'app-assistant-placeholder'
  placeholder.dataset.forMessageId = messageId
  conversationContainer.appendChild(placeholder)
  
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scrollOptions = prefersReduced ? { block: 'nearest', inline: 'nearest' } : { behavior: 'smooth', block: 'center' }
  userMessageWrapper.scrollIntoView(scrollOptions)
  placeholder.scrollIntoView(scrollOptions)
}

/**
 * Render the assistant's message into the conversation container.
 * @param {string} content
 * @param {string} modelName
 * @param {string|number|Date} timestamp
 */
function renderAssistantMessage (content, modelName, timestamp) {
  const conversationContainer = findElement('.app-conversation-container')
  if (!conversationContainer) {
    return
  }

  const assistantDiv = document.createElement('div')
  assistantDiv.className = 'app-assistant-response govuk-body govuk-!-width-two-thirds'
  assistantDiv.innerHTML = content || ''

  const metaDiv = document.createElement('div')
  metaDiv.className = 'govuk-!-display-flex govuk-!-justify-content-space-between govuk-!-margin-top-0'

  const metaP = document.createElement('p')
  metaP.className = 'govuk-body-s govuk-!-margin-top-0 govuk-!-margin-bottom-0'
  const timePart = timestamp ? ` at ${new Date(timestamp).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''
  metaP.innerHTML = `<strong>AI assistant</strong>${modelName ? ` (${modelName})` : ''}${timePart}`

  metaDiv.appendChild(metaP)

  conversationContainer.appendChild(assistantDiv)
  conversationContainer.appendChild(metaDiv)

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scrollOptions = prefersReduced ? { block: 'nearest', inline: 'nearest' } : { behavior: 'smooth', block: 'center' }
  assistantDiv.scrollIntoView(scrollOptions)

  assistantDiv.focus()
}

/**
 * Render an inline loading placeholder for the assistant response associated
 * with a given user message id.
 * @param {string} userMessageId
 */
function renderInlineLoading (userMessageId) {
  const placeholder = findElement(`.app-assistant-placeholder[data-for-message-id="${userMessageId}"]`)
  if (!placeholder) return

  placeholder.innerHTML = `
    <div class="app-assistant-response govuk-body govuk-!-width-two-thirds">
      <div class="chat-loading" aria-hidden="true">
        <span class="chat-loading__text">AI assistant is typing</span>
        <span class="chat-loading__dots">
          <span class="chat-loading__dot"></span>
          <span class="chat-loading__dot"></span>
          <span class="chat-loading__dot"></span>
        </span>
      </div>
    </div>
  `
}

/**
 * Replace the inline loading placeholder with the assistant message content.
 * @param {string} userMessageId
 * @param {string} content
 * @param {string} modelName
 * @param {string|number|Date} timestamp
 */
function replaceInlineLoadingWithAssistant (userMessageId, content, modelName, timestamp) {
  const placeholder = findElement(`.app-assistant-placeholder[data-for-message-id="${userMessageId}"]`)
  if (!placeholder) return

  const assistantHtml = `
    <div class="app-assistant-response govuk-body govuk-!-width-two-thirds">${content || ''}</div>
    <div class="govuk-!-display-flex govuk-!-justify-content-space-between govuk-!-margin-top-0">
      <p class="govuk-body-s govuk-!-margin-top-0 govuk-!-margin-bottom-0">
        <strong>AI assistant</strong>${modelName ? ` (${modelName})` : ''}${timestamp ? ` at ${new Date(timestamp).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
      </p>
    </div>
  `

  placeholder.innerHTML = assistantHtml
  const assistantEl = placeholder.querySelector('.app-assistant-response')
  if (assistantEl) {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scrollOptions = prefersReduced ? { block: 'nearest', inline: 'nearest' } : { behavior: 'smooth', block: 'center' }
    assistantEl.scrollIntoView(scrollOptions)
    assistantEl.focus()
  }
}

/**
 * Replace inline loading with an error message for the given user message id.
 * @param {string} userMessageId
 * @param {{isRetryable:boolean, timestamp?:string}} errorDetails
 */
function replaceInlineLoadingWithError (userMessageId, errorDetails) {
  const placeholder = findElement(`.app-assistant-placeholder[data-for-message-id="${userMessageId}"]`)
  if (!placeholder) return

  const retryable = errorDetails && errorDetails.isRetryable

  placeholder.innerHTML = `
    <div class="app-error-message" role="alert" aria-live="polite" tabindex="-1">
      <h3 class="govuk-heading-s govuk-!-margin-bottom-2">There is a problem</h3>
      <div class="app-error-message__body">
        ${retryable ? '<p class="govuk-body">The response took too long and timed out.</p>' : '<p class="govuk-body">Something went wrong and we cannot continue this conversation.</p>'}
      </div>
    </div>
  `
}

/**
 * Fetch a conversation from the frontend JSON endpoint.
 * @param {string} conversationId
 * @returns {Promise<Object>} conversation JSON
 */
async function fetchConversation (conversationId) {
  const response = await fetch(`/api/conversations/${conversationId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.status}`)
  }
  return response.json()
}

/**
 * Find the assistant message that follows the user's message in a conversation.
 * @param {Object} conversation
 * @param {string} userMessageId
 * @returns {{userMessageIndex:number, assistant:Object|null}}
 */
function findAssistantMessage (conversation, userMessageId) {
  const userMessageIndex = conversation.messages.findIndex(msg => msg.messageId === userMessageId)
  if (userMessageIndex === -1) {
    return { userMessageIndex: -1, assistant: null }
  }
  return { userMessageIndex, assistant: conversation.messages[userMessageIndex + 1] || null }
}

/**
 * Send a question to the frontend `POST /api/chat` proxy endpoint.
 * @param {string} question
 * @param {string} modelId
 * @param {string|null} conversationId
 * @returns {Promise<Object>} response JSON containing conversationId and messageId
 */
async function postChat (question, modelId, conversationId) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question, modelId, conversationId })
  })

  if (!response.ok) {
    throw new Error('Failed to send question')
  }

  return response.json()
}

/**
 * Enable or disable the question textarea and submit button on the form.
 * @param {HTMLFormElement} form
 * @param {boolean} disabled
 */
function setFormDisabled (form, disabled) {
  const questionTextarea = form.querySelector('#question')
  const submitButton = form.querySelector('button[type="submit"]')
  if (submitButton) submitButton.disabled = disabled
  if (questionTextarea) questionTextarea.disabled = disabled
}

export {
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
}
