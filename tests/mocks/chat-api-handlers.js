import nock from 'nock'

const chatApiBaseUrl = 'http://host.docker.internal:3018'

// Store posted conversations to return them on GET
const conversationStore = new Map()

/**
 * Setup mock handlers for the chat API using nock
 */
function setupChatApiMocks (responseType = 'plaintext') {
  const responses = {
    markdown: {
      conversationId: 'mock-conversation-123',
      messages: [
        {
          role: 'user',
          content: 'What is **UCD**?'
        },
        {
          role: 'assistant',
          content: '# Crop Rotation Guide\n\n## Recommended 4-Year Cycle\n\n| Year | Crop | Benefit |\n|------|------|------|\n| 1 | Legumes | Fixes nitrogen |\n| 2 | Brassicas | Heavy feeder |\n| 3 | Root vegetables | Deep soil break |\n| 4 | Alliums | Pest control |\n\n## Soil pH Testing\n\n```bash\n# Check soil pH\nph_level=$(test_soil sample.txt)\nif [ $ph_level -lt 6 ]; then\n  echo "Add lime"\nfi\n```\n\n## Essential Spring Tasks\n\n- Prepare seedbeds\n- Test soil\n- Start seedlings',
          name: 'UCD Bot'
        }
      ]
    },
    plaintext: {
      conversationId: 'mock-conversation-123',
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
    }
  }

  nock(chatApiBaseUrl)
    .persist()
    .post('/chat', (body) => {
      return typeof body.question === 'string' && typeof body.model_id === 'string'
    })
    .reply(200, (uri, requestBody) => {
      const response = responses[responseType] || responses.plaintext
      const conversationId = 'mock-conversation-123'

      // Build the conversation with the actual question and mock response
      const conversation = {
        conversation_id: conversationId,
        messages: [
          {
            role: 'user',
            content: requestBody.question
          },
          ...response.messages.filter(m => m.role === 'assistant')
        ]
      }

      // Store for GET requests
      conversationStore.set(conversationId, conversation)

      return {
        conversationId,
        messageId: 'mock-message-456',
        messages: conversation.messages
      }
    })

  // Mock GET /conversations/{id} for retrieving conversations
  nock(chatApiBaseUrl)
    .persist()
    .get(/\/conversations\/(.*)/)
    .reply(200, (uri) => {
      const conversationId = uri.split('/conversations/')[1]
      const stored = conversationStore.get(conversationId)

      if (stored) {
        return stored
      }

      // Fallback to default response if not found
      const response = responses[responseType] || responses.plaintext
      return {
        conversation_id: conversationId,
        messages: response.messages
      }
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
      .post('/chat', (body) => {
        return typeof body.question === 'string' && typeof body.model_id === 'string'
      })
      .replyWithError('ETIMEDOUT')
  } else {
    nock(chatApiBaseUrl)
      .post('/chat', (body) => {
        return typeof body.question === 'string' && typeof body.model_id === 'string'
      })
      .reply(statusCode, { error: 'Error from chat API' })
  }
}

/**
 * Clean up all nock mocks
 */
function cleanupChatApiMocks () {
  nock.cleanAll()
  conversationStore.clear()
}

export { setupChatApiMocks, cleanupChatApiMocks, setupChatApiErrorMock }
