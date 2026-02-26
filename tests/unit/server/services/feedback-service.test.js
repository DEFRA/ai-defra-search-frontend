import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'

import { submitFeedback } from '../../../../src/server/services/feedback-service.js'
import { config } from '../../../../src/config/config.js'

describe('submitFeedback', () => {
  const feedbackApiBaseUrl = config.get('chatApiUrl')

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  test('should send wasHelpful as null when it is undefined', async () => {
    let capturedBody

    nock(feedbackApiBaseUrl)
      .post('/feedback', (body) => {
        capturedBody = body
        return true
      })
      .reply(200, { success: true })

    await submitFeedback({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      wasHelpful: undefined,
      comment: 'Test comment'
    })

    expect(capturedBody.was_helpful).toBe(null)
    expect(capturedBody.conversation_id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(capturedBody.comment).toBe('Test comment')
  })

  test('should send wasHelpful as null when it is empty string', async () => {
    let capturedBody

    nock(feedbackApiBaseUrl)
      .post('/feedback', (body) => {
        capturedBody = body
        return true
      })
      .reply(200, { success: true })

    await submitFeedback({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      wasHelpful: '',
      comment: 'Test comment'
    })

    expect(capturedBody.was_helpful).toBe(null)
  })

  test('should send conversationId as null when it is undefined', async () => {
    let capturedBody

    nock(feedbackApiBaseUrl)
      .post('/feedback', (body) => {
        capturedBody = body
        return true
      })
      .reply(200, { success: true })

    await submitFeedback({
      conversationId: undefined,
      wasHelpful: 'useful',
      comment: 'Test comment'
    })

    expect(capturedBody.conversation_id).toBe(null)
    expect(capturedBody.was_helpful).toBe('useful')
  })

  test('should send comment as null when it is undefined', async () => {
    let capturedBody

    nock(feedbackApiBaseUrl)
      .post('/feedback', (body) => {
        capturedBody = body
        return true
      })
      .reply(200, { success: true })

    await submitFeedback({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      wasHelpful: 'useful',
      comment: undefined
    })

    expect(capturedBody.comment).toBe(null)
  })

  test('should send valid feedback with all fields', async () => {
    let capturedBody

    nock(feedbackApiBaseUrl)
      .post('/feedback', (body) => {
        capturedBody = body
        return true
      })
      .reply(200, { success: true })

    await submitFeedback({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      wasHelpful: 'very-useful',
      comment: 'This was helpful!'
    })

    expect(capturedBody.conversation_id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(capturedBody.was_helpful).toBe('very-useful')
    expect(capturedBody.comment).toBe('This was helpful!')
  })

  test('should throw error when API returns error status', async () => {
    nock(feedbackApiBaseUrl)
      .post('/feedback')
      .reply(500, { error: 'Internal server error' })

    await expect(
      submitFeedback({
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        wasHelpful: 'useful',
        comment: 'Test'
      })
    ).rejects.toThrow('Feedback API returned 500: Internal Server Error')
  })

  test('should throw error when API request fails', async () => {
    nock(feedbackApiBaseUrl)
      .post('/feedback')
      .replyWithError('Network error')

    await expect(
      submitFeedback({
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        wasHelpful: 'useful',
        comment: 'Test'
      })
    ).rejects.toThrow('Failed to submit feedback to API')
  })
})
