import nock from 'nock'

const modelsApiBaseUrl = 'http://host.docker.internal:3018'

/**
 * Setup mock handlers for the models API using nock
 */
function setupModelsApiMocks () {
  // GET /models - successful response
  nock(modelsApiBaseUrl)
    .persist() // Keep this mock active for all tests
    .get('/models')
    .reply(200, [
      {
        modelName: 'Sonnet 3.7',
        modelDescription: 'Best for detailed guidance and complex questions'
      },
      {
        modelName: 'Haiku',
        modelDescription: 'Best for quick answers and simple questions'
      }
    ])

  return nock
}

/**
 * Setup error mock for models API
 * @param {number} statusCode - HTTP status code to return (500, 502, 503, 504)
 * @param {string} errorType - Type of error ('timeout' for network timeout, or undefined for HTTP error)
 */
function setupModelsApiErrorMock (statusCode, errorType) {
  nock.cleanAll()

  if (errorType === 'timeout') {
    nock(modelsApiBaseUrl)
      .get('/models')
      .replyWithError('ETIMEDOUT')
  } else {
    nock(modelsApiBaseUrl)
      .get('/models')
      .reply(statusCode, { error: 'Error from models API' })
  }
}

/**
 * Clean up all nock mocks
 */
function cleanupModelsApiMocks () {
  nock.cleanAll()
}

export { setupModelsApiMocks, cleanupModelsApiMocks, setupModelsApiErrorMock }
