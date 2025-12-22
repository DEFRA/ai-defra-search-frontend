import nock from 'nock'

const feedbackApiBaseUrl = 'http://host.docker.internal:3018'

/**
 * Setup mock handlers for the feedback API using nock
 */
function setupFeedbackApiMocks () {
  // POST /feedback - successful response
  nock(feedbackApiBaseUrl)
    .persist()
    .post('/feedback', (body) => {
      return (
        (typeof body.conversation_id === 'string' || body.conversation_id === null) &&
        typeof body.was_helpful === 'string'
      )
    })
    .reply(200, {
      success: true,
      message: 'Feedback received'
    })

  return nock
}

/**
 * Setup error mock for feedback API
 * @param {number} statusCode - HTTP status code to return (400, 500, 502, 503, 504)
 * @param {string} errorType - Type of error ('timeout' for network timeout, or undefined for HTTP error)
 */
function setupFeedbackApiErrorMock (statusCode, errorType) {
  nock.cleanAll()

  if (errorType === 'timeout') {
    nock(feedbackApiBaseUrl)
      .post('/feedback')
      .replyWithError('ETIMEDOUT')
  } else {
    nock(feedbackApiBaseUrl)
      .post('/feedback')
      .reply(statusCode, { error: 'Error from feedback API' })
  }
}

/**
 * Setup mock to verify specific feedback payload
 * @param {Object} expectedPayload - Expected payload structure
 */
function setupFeedbackApiMockWithValidation (expectedPayload) {
  nock(feedbackApiBaseUrl)
    .post('/feedback', (body) => {
      return (
        body.conversation_id === expectedPayload.conversationId &&
        body.was_helpful === expectedPayload.wasHelpful &&
        (expectedPayload.comment ? body.comment === expectedPayload.comment : true)
      )
    })
    .reply(200, {
      success: true,
      message: 'Feedback received'
    })

  return nock
}

/**
 * Clean up all nock mocks
 */
function cleanupFeedbackApiMocks () {
  nock.cleanAll()
}

export {
  cleanupFeedbackApiMocks,
  setupFeedbackApiErrorMock,
  setupFeedbackApiMocks,
  setupFeedbackApiMockWithValidation
}
