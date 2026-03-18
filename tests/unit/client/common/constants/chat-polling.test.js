import { describe, test, expect } from 'vitest'
import { chatPollingConstants } from '../../../../../src/client/common/constants/chat-polling.js'

describe('chatPollingConstants', () => {
  test('exports an object', () => {
    expect(chatPollingConstants).toBeTypeOf('object')
    expect(chatPollingConstants).not.toBeNull()
  })

  test('pollIntervalMs is 2000', () => {
    expect(chatPollingConstants.pollIntervalMs).toBe(2000)
  })

  test('maxRetries is 5', () => {
    expect(chatPollingConstants.maxRetries).toBe(5)
  })

  test('exports only the expected keys', () => {
    expect(Object.keys(chatPollingConstants)).toEqual(['pollIntervalMs', 'maxRetries'])
  })
})
