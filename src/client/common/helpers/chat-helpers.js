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
  userMessage.textContent = question

  const timestamp = document.createElement('p')
  timestamp.className = 'govuk-body-s govuk-!-text-align-right govuk-!-margin-top-0'
  const now = new Date()
  const timeString = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
  timestamp.innerHTML = `<strong>You</strong> at ${timeString}`

  userMessageWrapper.appendChild(userMessage)
  conversationContainer.appendChild(userMessageWrapper)
  conversationContainer.appendChild(timestamp)
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

  const assistantResponse = document.createElement('div')
  assistantResponse.className = 'app-assistant-response-wrapper'
  assistantResponse.innerHTML = `
    <div class="app-assistant-response">
      <div class="app-assistant-response-content">${content}</div>
      <div class="app-assistant-response-meta">
        <span class="app-assistant-response-model">${modelName}</span>
        <span class="app-assistant-response-timestamp">${new Date(timestamp).toLocaleString()}</span>
      </div>
    </div>
  `

  const metaWrapper = document.createElement('div')
  metaWrapper.className = 'app-assistant-response-meta-wrapper'
  metaWrapper.appendChild(assistantResponse)

  conversationContainer.appendChild(assistantResponse)
  conversationContainer.appendChild(metaWrapper)

  assistantResponse.focus()
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
  fetchConversation,
  findAssistantMessage,
  postChat,
  setFormDisabled
}
