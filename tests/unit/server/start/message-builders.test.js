import { describe, test, expect } from 'vitest'

const {
  buildUserMessage,
  buildPlaceholderMessage,
  hasPendingResponse,
  PLACEHOLDER_MESSAGE
} = await import('../../../../src/server/start/message-builders.js')

describe('buildUserMessage', () => {
  test('returns a user message with parsed markdown content and metadata', () => {
    const msg = buildUserMessage('Hello **world**', 'msg-1')

    expect(msg).toMatchObject({
      role: 'user',
      message_id: 'msg-1',
      status: 'completed',
      timestamp: expect.any(String)
    })
    expect(msg.content).toContain('<strong>world</strong>')
  })
})

describe('buildPlaceholderMessage', () => {
  test('returns an assistant pending placeholder with the given messageId', () => {
    const msg = buildPlaceholderMessage('msg-2')

    expect(msg).toMatchObject({
      role: 'assistant',
      message_id: 'msg-2',
      status: 'pending',
      isPlaceholder: true
    })
    expect(msg.content).toContain(PLACEHOLDER_MESSAGE.split(' ')[0])
  })

  test('defaults messageId to null when not provided', () => {
    const msg = buildPlaceholderMessage()

    expect(msg.message_id).toBeNull()
  })
})

describe('hasPendingResponse', () => {
  test('returns true when messages contain a placeholder', () => {
    const messages = [
      { role: 'user', content: 'q' },
      { role: 'assistant', isPlaceholder: true }
    ]

    expect(hasPendingResponse(messages)).toBe(true)
  })

  test('returns false when no messages are placeholders', () => {
    const messages = [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' }
    ]

    expect(hasPendingResponse(messages)).toBe(false)
  })

  test('returns false for empty or nullish messages', () => {
    expect(hasPendingResponse([])).toBe(false)
    expect(hasPendingResponse(null)).toBe(false)
    expect(hasPendingResponse(undefined)).toBe(false)
  })
})
