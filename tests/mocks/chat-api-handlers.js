import nock from 'nock'

/**
 * Setup mock handlers for the chat API using nock
 */
function setupChatApiMocks () {
  // Mock the chat API base URL
  const chatApiBaseUrl = 'http://host.docker.internal:3018'

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
 * Clean up all nock mocks
 */
function cleanupChatApiMocks () {
  nock.cleanAll()
}

export { setupChatApiMocks, cleanupChatApiMocks }

