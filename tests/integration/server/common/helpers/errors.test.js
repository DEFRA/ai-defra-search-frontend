import { createServer } from '../../../../../src/server/server.js'
import { statusCodes } from '../../../../../src/server/common/constants/status-codes.js'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining('Page not found | ai-defra-search-frontend')
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })
})
