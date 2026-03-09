import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../../src/server/common/helpers/audit.js', () => ({
  auditLoginSuccess: vi.fn()
}))

const { auditLoginSuccess } = await import('../../../../src/server/common/helpers/audit.js')
const { authController } = await import('../../../../src/server/auth/controller.js')

describe('auth controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('throws when authentication fails', async () => {
    const request = {
      auth: { isAuthenticated: false }
    }
    const h = { redirect: vi.fn() }

    await expect(authController.handler(request, h)).rejects.toThrow('Authentication failed')
  })

  test('stores session, sets cookie, emits audit event and redirects', async () => {
    const cacheSet = vi.fn().mockResolvedValue()
    const cookieSet = vi.fn()
    const h = { redirect: vi.fn().mockReturnValue('redirected') }

    const request = {
      auth: {
        isAuthenticated: true,
        credentials: {
          profile: {
            id: 'user-123',
            displayName: 'Test User',
            email: 'test@example.com'
          },
          token: 'oidc-token'
        }
      },
      server: {
        app: {
          cache: {
            set: cacheSet
          }
        }
      },
      cookieAuth: {
        set: cookieSet
      },
      info: {
        remoteAddress: '127.0.0.1'
      }
    }

    const result = await authController.handler(request, h)

    expect(cacheSet).toHaveBeenCalledTimes(1)

    const [sessionId, session] = cacheSet.mock.calls[0]
    expect(session).toEqual({
      isAuthenticated: true,
      id: 'user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      token: 'oidc-token'
    })

    expect(cookieSet).toHaveBeenCalledWith({ id: sessionId })
    expect(auditLoginSuccess).toHaveBeenCalledWith({
      userId: 'user-123',
      sessionId,
      sourceIp: '127.0.0.1'
    })
    expect(h.redirect).toHaveBeenCalledWith('/')
    expect(result).toBe('redirected')
  })
})
