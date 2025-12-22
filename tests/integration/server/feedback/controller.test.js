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

  beforeEach(() => {
    cleanupFeedbackApiMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    cleanupFeedbackApiMocks()
  })

  describe('GET /feedback', () => {
    test('should return the feedback page with conversation ID', async () => {
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
      expect(radioButtons.length).toBe(5)

      // Check for 5-point scale options
      const bodyText = page.body.textContent
      expect(bodyText).toContain('Very useful')
      expect(bodyText).toContain('Not at all useful')

      // Check conversation ID is in the form
      const hiddenInput = page.querySelector('input[name="conversationId"]')
      expect(hiddenInput?.value).toBe(conversationId)
    })

    test('should return the feedback page without conversation ID', async () => {
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
    test('should submit feedback successfully with "very-useful" response', async () => {
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'very-useful'
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should submit feedback successfully with "not-useful" response', async () => {
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'not-useful'
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should submit feedback successfully with optional comment', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000'
      const comment = 'This was very helpful, thank you!'

      setupFeedbackApiMockWithValidation({
        conversationId,
        wasHelpful: 'useful',
        comment
      })

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'useful',
          comment
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should return validation error when wasHelpful is empty', async () => {
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
      expect(errorSummary?.textContent).toContain('Select how useful the AI Assistant was')
    })

    test('should return validation error when wasHelpful is invalid', async () => {
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
      expect(errorSummary?.textContent).toContain('Select how useful the AI Assistant was')
    })

    test('should allow missing conversationId as it is optional', async () => {
      setupFeedbackApiMocks()

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          wasHelpful: 'very-useful',
          conversationId: ''
        }
      })

      // Should succeed since conversationId is optional
      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should handle API error gracefully', async () => {
      setupFeedbackApiErrorMock(500)

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'useful'
        }
      })

      expect(response.statusCode).toBe(statusCodes.INTERNAL_SERVER_ERROR)

      const { window } = new JSDOM(response.result)
      const page = window.document

      // Check for error message
      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(errorSummary?.textContent).toContain('There was a problem submitting your feedback')

      // Form should retain user input
      const hiddenInput = page.querySelector('input[name="conversationId"]')
      expect(hiddenInput?.value).toBe(conversationId)

      const usefulRadio = page.querySelector('input[value="useful"]')
      expect(usefulRadio?.checked).toBe(true)
    })

    test('should handle API timeout gracefully', async () => {
      setupFeedbackApiErrorMock(500, 'timeout')

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'neither',
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

    test('should handle long comments within character limit', async () => {
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'
      const longComment = 'This is a very detailed comment. '.repeat(35) // About 1100 characters

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'very-useful',
          comment: longComment
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(response.headers.location).toBe('/feedback/success')
    })

    test('should reject comments exceeding character limit', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000'
      const tooLongComment = 'x'.repeat(1201) // Exceeds 1200 character limit

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'very-useful',
          comment: tooLongComment
        }
      })

      expect(response.statusCode).toBe(statusCodes.BAD_REQUEST)

      const { window } = new JSDOM(response.result)
      const page = window.document

      const errorSummary = page.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(errorSummary?.textContent).toContain('1200 characters')
    })
  })

  describe('GET /feedback/success', () => {
    test('should return the success page', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/feedback/success'
      })

      expect(response.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(response.result)
      const page = window.document

      // Check for success message
      const panel = page.querySelector('.govuk-panel__title')
      expect(panel?.textContent).toContain('Feedback submitted')

      const bodyText = page.body.textContent
      expect(bodyText).toContain('feedback')
    })
  })

  describe('Feedback flow integration', () => {
    test('should complete full feedback journey from start to success', async () => {
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
          wasHelpful: 'useful',
          comment: 'Very helpful information!'
        }
      })

      expect(submitResponse.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(submitResponse.headers.location).toBe('/feedback/success')

      // Step 3: View success page
      const successResponse = await server.inject({
        method: 'GET',
        url: '/feedback/success'
      })

      expect(successResponse.statusCode).toBe(statusCodes.OK)

      const { window } = new JSDOM(successResponse.result)
      const page = window.document

      const panel = page.querySelector('.govuk-panel__title')
      expect(panel?.textContent).toContain('Feedback submitted')
    })

    test('should handle negative feedback with comment', async () => {
      setupFeedbackApiMocks()

      const conversationId = '550e8400-e29b-41d4-a716-446655440000'

      const response = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          conversationId,
          wasHelpful: 'not-at-all-useful',
          comment: 'The answer was not relevant to my question about crop rotation.'
        }
      })

      expect(response.statusCode).toBe(statusCodes.MOVED_TEMPORARILY) // 302 redirect (Hapi's default)
      expect(response.headers.location).toBe('/feedback/success')
    })
  })
})
