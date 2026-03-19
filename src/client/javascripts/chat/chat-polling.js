import { chatPollingConstants } from '../../common/constants/chat-polling.js'

const {
  pollIntervalMs: POLL_INTERVAL_MS,
  maxRetries: MAX_RETRIES,
  initialRetries: INITIAL_RETRIES
} = chatPollingConstants

const showLoading = () => {
  const statusEl = document.getElementById('ai-status')
  const loadingEl = document.querySelector('[data-chat-loading]')

  if (statusEl) {
    statusEl.textContent = 'AI assistant is generating a response'
  }
  if (loadingEl) {
    loadingEl.removeAttribute('hidden')
  }
}

const hideLoading = () => {
  const statusEl = document.getElementById('ai-status')
  const loadingEl = document.querySelector('[data-chat-loading]')

  if (statusEl) {
    statusEl.textContent = ''
  }
  if (loadingEl) {
    loadingEl.setAttribute('hidden', '')
  }
}

const pollForResponse = (conversationId, retries = INITIAL_RETRIES) => {
  setTimeout(async () => {
    try {
      const response = await fetch(`/start/${conversationId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const container = doc.querySelector('.app-conversation-container[data-response-pending]')

      if (container?.dataset.responsePending === 'false') {
        hideLoading()
        globalThis.location.reload()
      } else {
        pollForResponse(conversationId, INITIAL_RETRIES)
      }
    } catch {
      if (retries < MAX_RETRIES) {
        pollForResponse(conversationId, retries + 1)
      } else {
        hideLoading()
      }
    }
  }, POLL_INTERVAL_MS)
}

const initChatPolling = () => {
  const container = document.querySelector(
    '.app-conversation-container[data-response-pending="true"]'
  )

  if (!container) {
    return
  }

  const conversationId = container.dataset.conversationId

  if (!conversationId) {
    return
  }

  showLoading()
  pollForResponse(conversationId)
}

export { initChatPolling }
