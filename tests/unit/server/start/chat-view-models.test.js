import { describe, test, expect } from 'vitest'

const { buildUserMessage, buildPlaceholderMessage, PLACEHOLDER_MESSAGE } = await import('../../../../src/server/start/chat-view-models.js')

describe('chat-view-models factories', () => {
  test('buildUserMessage returns parsed content and expected fields', () => {
    const question = 'Hello **world**'
    const msg = buildUserMessage(question, 'msg-1')

    expect(msg).toHaveProperty('role', 'user')
    expect(msg).toHaveProperty('message_id', 'msg-1')
    expect(msg).toHaveProperty('status', 'completed')
    expect(msg).toHaveProperty('timestamp')
    expect(typeof msg.timestamp).toBe('string')
    // markdown should be parsed
    expect(msg.content).toContain('<strong>world</strong>')
  })

  test('buildPlaceholderMessage returns assistant pending placeholder', () => {
    const msg = buildPlaceholderMessage('msg-2')

    expect(msg).toHaveProperty('role', 'assistant')
    expect(msg).toHaveProperty('message_id', 'msg-2')
    expect(msg).toHaveProperty('status', 'pending')
    expect(msg).toHaveProperty('isPlaceholder', true)
    expect(msg.content).toContain(PLACEHOLDER_MESSAGE.split(' ')[0])
  })

  test('buildPlaceholderMessage defaults message_id to null', () => {
    const msg = buildPlaceholderMessage()
    expect(msg).toHaveProperty('message_id', null)
  })
})
