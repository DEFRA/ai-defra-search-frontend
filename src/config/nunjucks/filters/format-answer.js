/**
 * Format AI response text for better display
 * Handles line breaks, paragraphs, and basic formatting
 * @param {string} text - The raw AI response text
 * @returns {string} HTML formatted text
 */
export function formatAnswer(text) {
  if (!text) return ''

  // Split by double line breaks to handle paragraphs
  const paragraphs = text.split('\n\n')

  return paragraphs
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => {
      // Handle numbered lists (lines starting with "1. ", "2. ", etc.)
      if (paragraph.includes('\n') && /^\d+\.\s/.test(paragraph.trim())) {
        const items = paragraph
          .split('\n')
          .filter((item) => item.trim())
          .map((item) => `<li class="govuk-body">${item.trim()}</li>`)
          .join('')
        return `<ol class="govuk-list govuk-list--number">${items}</ol>`
      }

      // Handle bullet points (lines starting with "- " or "• ")
      if (paragraph.includes('\n') && /^[-•]\s/.test(paragraph.trim())) {
        const items = paragraph
          .split('\n')
          .filter((item) => item.trim())
          .map((item) => {
            const cleanItem = item.replace(/^[-•]\s/, '').trim()
            return `<li class="govuk-body">${cleanItem}</li>`
          })
          .join('')
        return `<ul class="govuk-list govuk-list--bullet">${items}</ul>`
      }

      // Handle regular paragraphs (convert single line breaks to <br>)
      const formattedParagraph = paragraph.trim().replace(/\n/g, '<br>')
      return `<p class="govuk-body">${formattedParagraph}</p>`
    })
    .join('')
}
