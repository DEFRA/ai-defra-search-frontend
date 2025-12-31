import { createServer } from '../../../../../../src/server/server.js'

describe('#contentSecurityPolicy', () => {
  let server
  let originalEnv

  beforeAll(async () => {
    originalEnv = { ...process.env }

    process.env.AUTH_ENABLED = 'false'

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })

    process.env = originalEnv
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/start'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
