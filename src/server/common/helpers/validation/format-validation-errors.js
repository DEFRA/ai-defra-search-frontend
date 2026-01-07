/**
 * Formats Joi validation errors into GDS error summary format
 * @param {Array} validationErrors - Array of Joi validation error details
 * @returns {Array} Array of error objects with text and href properties
 */
function formatGdsErrorSummary (validationErrors) {
  return validationErrors.map((error) => ({
    text: error.message,
    href: `#${error.path[0]}`
  }))
}

/**
 * Formats Joi validation errors into field-specific errors for inline display
 * @param {Array} validationErrors - Array of Joi validation error details
 * @returns {Object} Object mapping field names to error objects
 */
function formatFieldErrors (validationErrors) {
  return validationErrors.reduce((acc, error) => {
    const field = error.path[0]
    acc[field] = { text: error.message }
    return acc
  }, {})
}

export { formatGdsErrorSummary, formatFieldErrors }
