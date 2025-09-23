import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

// Progressive enhancement: change button text and disable submit on form submit
document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('#question-form form')
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null
  if (form && submitBtn) {
    form.addEventListener('submit', function () {
      submitBtn.textContent = 'Waiting for AI response…'
      submitBtn.disabled = true
      // Scroll chat to bottom on submit (for chat page)
      const chatScroll = document.querySelector('.chat-scroll-area')
      if (chatScroll) {
        chatScroll.scrollTop = chatScroll.scrollHeight
      }
    })
  }

  // Always scroll chat so last AI message is at the top of the visible area (for chat page)
  const chatScroll = document.querySelector('.chat-scroll-area')
  if (chatScroll) {
    const aiMessages = chatScroll.querySelectorAll('.chat-message.ai')
    const lastAI =
      aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null
    if (lastAI) {
      chatScroll.scrollTop = lastAI.offsetTop - chatScroll.offsetTop
    } else {
      chatScroll.scrollTop = chatScroll.scrollHeight
    }
  }
})
