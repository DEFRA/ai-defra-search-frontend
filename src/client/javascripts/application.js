import {
  initAll,
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

initAll()

/**
 * Initialize auto-growing textarea for question input
 */
function initAutoGrowTextarea () {
  const textarea = document.getElementById('question')

  if (!textarea) {
    return
  }

  /**
   * Adjust textarea height based on content
   * @param {HTMLTextAreaElement} element - The textarea element
   */
  function adjustHeight (element) {
    // Reset height to auto to get the correct scrollHeight
    element.style.height = 'auto'

    // Set the height to match the scroll height
    element.style.height = element.scrollHeight + 'px'
  }

  // Adjust height on input
  textarea.addEventListener('input', function () {
    adjustHeight(this)
  })

  // Adjust height on page load (in case there's pre-filled content)
  if (textarea.value) {
    adjustHeight(textarea)
  }
}

// Initialize auto-grow textarea when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoGrowTextarea)
} else {
  initAutoGrowTextarea()
}
