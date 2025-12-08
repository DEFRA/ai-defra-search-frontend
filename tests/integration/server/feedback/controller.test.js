import statusCodes from 'http-status-codes'
import { JSDOM } from 'jsdom'

import { createServer } from '../../../../src/server/server.js'
import {
  cleanupFeedbackApiMocks,
  setupFeedbackApiErrorMock,
  setupFeedbackApiMocks,
  setupFeedbackApiMockWithValidation
} from '../../../mocks/feedback-api-handlers.js'

describe('Feedback routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    cleanupFeedbackApiMocks()
  })

  describe('GET /feedback', () => {
    test('should return the feedback page with conversation ID', async () => {
      cleanupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'GET',
        url: `/feedback?conversationId=${conversationId}`
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      // Check for feedback heading
      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Give feedback on the AI Assistant')

      // Check for radio buttons
      const radioButtons = page.querySelectorAll('input[type="radio"]')
      expect(radioButtons.length).toBe(2)

      // Check for Yes/No options
      const bodyText = page.body.textContent
      expect(bodyText).toContain('Yes')
      expect(bodyText).toContain('No')

      // Check conversation ID is in the form
      const hiddenInput = page.querySelector('input[name="conversationId"]')
      expect(hiddenInput?.value).toBe(conversationId)
    })

    test('should return the feedback page without conversation ID', async () => {
      cleanupFeedbackApiMocks()

      const response = await server.inject({
        method: 'GET',
        url: '/feedback'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Give feedback on the AI Assistant')
    })
  })

  describe('POST /feedback', () => {
    // TODO: Uncomment these tests when frontend and backend are connected (JIRA ticket needed)
    // These tests require the /feedback endpoint to be available on the backend API
    test.skip('should submit feedback successfully with "yes" response', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'yes'
        }
      })

      expect(response.statusCode).toBe(statusCodes.FOUND) // 302 redirect
      expect(response.headers.location).toBe('/feedback/success')
    })

    test.skip('should submit feedback successfully with "no" response', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'no'
        }
      })

      expect(response.statusCode).toBe(statusCodes.FOUND)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test.skip('should submit feedback successfully with optional comment', async () => {
      cleanupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'
      const comment = 'This was very helpful, thank you!'

      setupFeedbackApiMockWithValidation({
        conversationId,
        wasHelpful: 'yes',
        comment
      })

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'yes',
          comment
        }
      })

      expect(response.statusCode).toBe(statusCodes.FOUND)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test.skip('should return validation error when wasHelpful is empty', async () => {
      cleanupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: '' // Empty string
        }
      })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

      const { window } = new JSDOM(response.result)
      const page = window.document

      // Check for error message
      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(errorSummary?.textContent).toContain('Please select yes or no')
    })

    test('should return validation error when wasHelpful is invalid', async () => {
      cleanupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'maybe' // Invalid value
        }
      })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(errorSummary?.textContent).toContain('Please select yes or no')
    })

    test.skip('should allow missing conversationId as it is optional', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          wasHelpful: 'yes',
          conversationId: ''
        }
      })

      // Should succeed since conversationId is optional
      expect(response.statusCode).toBe(statusCodes.FOUND)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should handle API error gracefully', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiErrorMock(500)

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'yes'
        }
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

      const { window } = new JSDOM(response.result)
      const page = window.document

      // Check for error message
      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(errorSummary?.textContent).toContain('there was a problem submitting your feedback')

      // Form should retain user input
      const hiddenInput = page.querySelector('input[name="conversationId"]')
      expect(hiddenInput?.value).toBe(conversationId)

      const yesRadio = page.querySelector('input[value="yes"]')
      expect(yesRadio?.checked).toBe(true)
    })

    test('should handle API timeout gracefully', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiErrorMock(500, 'timeout')

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'no',
          comment: 'Not helpful at all'
        }
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()

      // Form should retain user input including comment
      const commentTextarea = page.querySelector('textarea[name="comment"]')
      expect(commentTextarea?.textContent).toBe('Not helpful at all')
    })

    test.skip('should handle long comments within character limit', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'
      const longComment = 'This is a very detailed comment. '.repeat(30) // About 900 characters

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'yes',
          comment: longComment.substring(0, 1000) // Within limit
        }
      })

      expect(response.statusCode).toBe(statusCodes.FOUND)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should reject comments exceeding character limit', async () => {
      cleanupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'
      const tooLongComment = 'x'.repeat(1001) // Exceeds 1000 character limit

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'yes',
          comment: tooLongComment
        }
      })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(errorSummary?.textContent).toContain('1000 characters')
    })
  })

  describe('GET /feedback/success', () => {
    test('should return the success page', async () => {
      cleanupFeedbackApiMocks()

      const response = await server.inject({
        method: 'GET',
        url: '/feedback/success'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      // Check for success message
      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Thank you')

      const bodyText = page.body.textContent
      expect(bodyText).toContain('feedback')
    })
  })

  describe('Feedback flow integration', () => {
    // TODO: Uncomment these tests when frontend and backend are connected (JIRA ticket needed)
    test.skip('should complete full feedback journey from start to success', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      // Step 1: Access feedback page
      const feedbackPageResponse = await server.inject({
        method: 'GET',
        url: `/feedback?conversationId=${conversationId}`
      })

      expect(feedbackPageResponse.statusCode).toBe(statusCodes.OK)

      // Step 2: Submit feedback
      const submitResponse = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'yes',
          comment: 'Very helpful information!'
        }
      })

      expect(submitResponse.statusCode).toBe(statusCodes.FOUND)
      expect(submitResponse.headers.location).toBe('/feedback/success')

      // Step 3: View success page
      const successResponse = await server.inject({
        method: 'GET',
        url: '/feedback/success'
      })

      expect(successResponse.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(successResponse.result)
      const page = window.document

      const heading = page.querySelector('h1')
      expect(heading?.textContent).toContain('Thank you')
    })

    test.skip('should handle negative feedback with comment', async () => {
      cleanupFeedbackApiMocks()
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'no',
          comment: 'The answer was not relevant to my question about crop rotation.'
        }
      })

      expect(response.statusCode).toBe(statusCodes.FOUND)
      expect(response.headers.location).toBe('/feedback/success')
    })
  })
})
