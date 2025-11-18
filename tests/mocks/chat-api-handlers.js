import nock from 'nock'

const chatApiBaseUrl = 'http://host.docker.internal:3018'

/**
 * Setup mock handlers for the chat API using nock
 */
function setupChatApiMocks () {
  // POST /chat - successful response
  nock(chatApiBaseUrl)
    .persist() // Keep this mock active for all tests
    .post('/chat')
    .reply(200, {
      conversation_id: 'mock-conversation-123',
      messages: [
        {
          role: 'user',
          content: 'What is UCD?'
        },
        {
          role: 'assistant',
          content: 'User-Centred Design (UCD) is a framework of processes in which usability goals, user characteristics, environment, tasks and workflow are given extensive attention at each stage of the design process.',
          name: 'UCD Bot'
        }
      ]
    })

  return nock
}

/**
 * Setup error mock for chat API
 * @param {number} statusCode - HTTP status code to return (500, 502, 503, 504)
 * @param {string} errorType - Type of error ('timeout' for network timeout, or undefined for HTTP error)
 */
function setupChatApiErrorMock (statusCode, errorType) {
  nock.cleanAll()

  if (errorType === 'timeout') {
    nock(chatApiBaseUrl)
      .post('/chat')
      .replyWithError('ETIMEDOUT')
  } else {
    nock(chatApiBaseUrl)
      .post('/chat')
      .reply(statusCode, { error: 'Error from chat API' })
  }
}

/**
 * Clean up all nock mocks
 */
function cleanupChatApiMocks () {
  nock.cleanAll()
}

export { setupChatApiMocks, cleanupChatApiMocks, setupChatApiErrorMock }
