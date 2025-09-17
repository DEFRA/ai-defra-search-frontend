import { describe, it } from 'node:test'
import { expect } from '@hapi/code'

import { formatAnswer } from './format-answer.js'

describe('formatAnswer filter', () => {
  it('should handle simple text with line breaks', () => {
    const input = 'First line\nSecond line'
    const expected = '<p class="govuk-body">First line<br>Second line</p>'
    expect(formatAnswer(input)).to.equal(expected)
  })

  it('should handle paragraphs with double line breaks', () => {
    const input = 'First paragraph\n\nSecond paragraph'
    const expected = '<p class="govuk-body">First paragraph</p><p class="govuk-body">Second paragraph</p>'
    expect(formatAnswer(input)).to.equal(expected)
  })

  it('should handle numbered lists', () => {
    const input = 'Here are the points:\n\n1. First point\n2. Second point\n3. Third point'
    const expected = '<p class="govuk-body">Here are the points:</p><p class="govuk-body"><ul class="govuk-list govuk-list--bullet"><li>1. First point<br><li>2. Second point<br><li>3. Third point</li></ul></p>'
    expect(formatAnswer(input)).to.equal(expected)
  })

  it('should handle bullet points', () => {
    const input = 'Key points:\n\n- First point\n- Second point\n- Third point'
    const expected = '<p class="govuk-body">Key points:</p><p class="govuk-body"><ul class="govuk-list govuk-list--bullet"><li>First point<br><li>Second point<br><li>Third point</li></ul></p>'
    expect(formatAnswer(input)).to.equal(expected)
  })

  it('should handle empty or null input', () => {
    expect(formatAnswer('')).to.equal('')
    expect(formatAnswer(null)).to.equal('')
    expect(formatAnswer(undefined)).to.equal('')
  })
})