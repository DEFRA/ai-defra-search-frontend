describe('Azure Entra Authentication Provider', () => {
  let server

  beforeAll(async () => {
    vitest.stubEnv('AUTH_ENABLED', 'true')
    vitest.stubEnv('PORT', '3097')
    vitest.stubEnv('MS_ENTRA_REDIRECT_HOST', 'http://localhost:3097')

    const { createServer } = await import('../../../../../src/server/server.js')
    server = await createServer()
    await server.initialize()

    await server.start()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })

    vitest.useRealTimers()

    vitest.unstubAllEnvs()
  })

  test('GET /auth/callback redirects to login.microsoftonline.com', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback'
    })

    expect(res.statusCode).toBe(302)

    const url = new URL(res.headers.location)

    expect(url.hostname).toBe('login.microsoftonline.com')

    expect(url.pathname).toMatch(new RegExp(`^/${'cb2d380f-8056-494b-bfad-cfcaf767c0b3'}/oauth2/v2\\.0/authorize$`))
    expect(url.searchParams.get('client_id')).toBe('28434819-c64a-4b95-bb23-0f6202bcfc02')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3097/auth/callback')
    expect(url.searchParams.get('scope')).toBe('openid profile User.Read')
  })
})
