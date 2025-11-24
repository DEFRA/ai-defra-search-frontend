import Bell from '@hapi/bell'

import { generateEntraJwt } from '../../../utils/oidc.js'
import { test } from 'vitest'

describe('OIDC Callback', () => {
  let server
  let originalEnv

  const mockCredentialsData = {
    provider: 'azure',
    token: generateEntraJwt(),
    profile: {
      id: 'user-id',
      displayName: 'Test User',
      mail: 'testuser@example.com'
    },
    query: {}
  }

  beforeAll(async () => {
    originalEnv = { ...process.env }

    process.env.AUTH_ENABLED = 'true'

    vitest.useFakeTimers()

    const { createServer } = await import('../../../../src/server/server.js')

    Bell.simulate((_request) => mockCredentialsData)

    server = await createServer()

    server.route([
      {
        method: 'GET',
        path: '/test-protected',
        handler: (_request, h) => {
          return h.response({ message: 'Protected content' }).code(200)
        }
      }
    ])

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })

    vitest.useRealTimers()

    Bell.simulate(false)

    process.env = originalEnv
  })

  beforeEach(async () => {
    await server.start()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('Routes should require authentication by default', async () => {
    const protectedRoutes = server.table()
      .filter(route => route.settings.auth === undefined)

    for (const route of protectedRoutes) {
      const res = await server.inject({
        method: route.method,
        url: route.path
      })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toBe('/auth/callback')
    }
  })

  test('GET /test-protected with no previous session should redirect to OIDC flow', async () => {
    const protectedRes = await server.inject({
      method: 'GET',
      url: '/test-protected'
    })

    expect(protectedRes.statusCode).toBe(302)
    expect(protectedRes.headers.location).toBe('/auth/callback')
  })

  test('GET /auth/callback with code should set session cookie and redirect to /start', async () => {
    vitest.setSystemTime(new Date('2025-11-24T00:00:00Z'))

    mockCredentialsData.token = generateEntraJwt()

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=dummy-auth-code',
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/start')

    const setCookieHeader = res.headers['set-cookie']
    expect(setCookieHeader).toBeDefined()
    expect(setCookieHeader.some(cookie => cookie.startsWith('sid='))).toBe(true)
  })

  test('GET /test-protected with valid jwt token in session should return protected content', async () => {
    vitest.setSystemTime(new Date('2025-11-24T00:00:00Z'))

    mockCredentialsData.token = generateEntraJwt()

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=dummy-auth-code',
    })

    const protectedRes = await server.inject({
      method: 'GET',
      url: '/test-protected',
      headers: {
        cookie: res.headers['set-cookie'].join(';')
      }
    })

    expect(protectedRes.statusCode).toBe(200)
    expect(protectedRes.result).toEqual({ message: 'Protected content' })
  })

  test('GET /test-protected after jwt expiry should redirect to OIDC flow', async () => {
    vitest.setSystemTime(new Date('2025-11-24T00:00:00Z'))

    mockCredentialsData.token = generateEntraJwt()

    const res = await server.inject({
      method: 'GET',
      url: '/auth/callback?code=dummy-auth-code',
    })

    vitest.setSystemTime(new Date('2025-11-24T00:31:00Z'))

    const protectedRes = await server.inject({
      method: 'GET',
      url: '/test-protected',
      headers: {
        cookie: res.headers['set-cookie'].join(';')
      }
    })

    expect(protectedRes.statusCode).toBe(302)
    expect(protectedRes.headers.location).toBe('/auth/callback')
  })
})
