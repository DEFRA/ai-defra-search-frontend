import { describe, test, expect } from 'vitest'
import { formatGdsErrorSummary, formatFieldErrors } from '../../../../../../src/server/common/helpers/validation/format-validation-errors.js'

describe('formatGdsErrorSummary', () => {
  test('should format single validation error', () => {
    const validationErrors = [
      { path: ['wasHelpful'], message: 'Select how useful the AI Assistant was' }
    ]

    const result = formatGdsErrorSummary(validationErrors)

    expect(result).toEqual([
      { text: 'Select how useful the AI Assistant was', href: '#wasHelpful' }
    ])
  })

  test('should format multiple validation errors', () => {
    const validationErrors = [
      { path: ['wasHelpful'], message: 'Select how useful the AI Assistant was' },
      { path: ['comment'], message: 'Comment must be 1200 characters or less' }
    ]

    const result = formatGdsErrorSummary(validationErrors)

    expect(result).toEqual([
      { text: 'Select how useful the AI Assistant was', href: '#wasHelpful' },
      { text: 'Comment must be 1200 characters or less', href: '#comment' }
    ])
  })

  test('should handle empty array', () => {
    const result = formatGdsErrorSummary([])
    expect(result).toEqual([])
  })

  test('should handle nested field paths', () => {
    const validationErrors = [
      { path: ['user', 'email'], message: 'Email is required' }
    ]

    const result = formatGdsErrorSummary(validationErrors)

    expect(result).toEqual([
      { text: 'Email is required', href: '#user' }
    ])
  })
})

describe('formatFieldErrors', () => {
  test('should format single validation error', () => {
    const validationErrors = [
      { path: ['wasHelpful'], message: 'Select how useful the AI Assistant was' }
    ]

    const result = formatFieldErrors(validationErrors)

    expect(result).toEqual({
      wasHelpful: { text: 'Select how useful the AI Assistant was' }
    })
  })

  test('should format multiple validation errors', () => {
    const validationErrors = [
      { path: ['wasHelpful'], message: 'Select how useful the AI Assistant was' },
      { path: ['comment'], message: 'Comment must be 1200 characters or less' }
    ]

    const result = formatFieldErrors(validationErrors)

    expect(result).toEqual({
      wasHelpful: { text: 'Select how useful the AI Assistant was' },
      comment: { text: 'Comment must be 1200 characters or less' }
    })
  })

  test('should handle empty array', () => {
    const result = formatFieldErrors([])
    expect(result).toEqual({})
  })

  test('should use first element of path for nested fields', () => {
    const validationErrors = [
      { path: ['user', 'email'], message: 'Email is required' }
    ]

    const result = formatFieldErrors(validationErrors)

    expect(result).toEqual({
      user: { text: 'Email is required' }
    })
  })

  test('should handle multiple errors for same field - keeps last one', () => {
    const validationErrors = [
      { path: ['comment'], message: 'Comment is required' },
      { path: ['comment'], message: 'Comment must be 1200 characters or less' }
    ]

    const result = formatFieldErrors(validationErrors)

    // reduce will overwrite with the last error for the same field
    expect(result).toEqual({
      comment: { text: 'Comment must be 1200 characters or less' }
    })
  })
})
