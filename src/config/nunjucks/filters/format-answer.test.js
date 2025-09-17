import { describe, it, expect } from 'vitest'

import { formatAnswer } from './format-answer.js'

describe('formatAnswer filter', () => {
  it('should handle simple text with line breaks', () => {
    const input = 'First line\nSecond line'
    const expected = '<p class="govuk-body">First line<br>Second line</p>'
    expect(formatAnswer(input)).toBe(expected)
  })

  it('should handle paragraphs with double line breaks', () => {
    const input = 'First paragraph\n\nSecond paragraph'
    const expected =
      '<p class="govuk-body">First paragraph</p><p class="govuk-body">Second paragraph</p>'
    expect(formatAnswer(input)).toBe(expected)
  })

  it('should handle numbered lists', () => {
    const input =
      'Here are the points:\n\n1. First point\n2. Second point\n3. Third point'
    const expected =
      '<p class="govuk-body">Here are the points:</p><ol class="govuk-list govuk-list--number"><li class="govuk-body">1. First point</li><li class="govuk-body">2. Second point</li><li class="govuk-body">3. Third point</li></ol>'
    expect(formatAnswer(input)).toBe(expected)
  })

  it('should handle bullet points', () => {
    const input = 'Key points:\n\n- First point\n- Second point\n- Third point'
    const expected =
      '<p class="govuk-body">Key points:</p><ul class="govuk-list govuk-list--bullet"><li class="govuk-body">First point</li><li class="govuk-body">Second point</li><li class="govuk-body">Third point</li></ul>'
    expect(formatAnswer(input)).toBe(expected)
  })

  it('should handle empty or null input', () => {
    expect(formatAnswer('')).toBe('')
    expect(formatAnswer(null)).toBe('')
    expect(formatAnswer(undefined)).toBe('')
  })
})
