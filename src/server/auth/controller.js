import { randomUUID as uuidv4 } from 'node:crypto'

export const authController = {
  async handler (request, h) {
    if (!request.auth.isAuthenticated) {
      throw new Error('Authentication failed')
    }

    const { profile, token } = request.auth.credentials

    request.server.logger.info('Signed in')
    request.server.logger.info({ profile }, 'Entra auth profile - checking OID field')

    const sessionId = uuidv4()

    await request.server.app.cache.set(sessionId, {
      isAuthenticated: true,
      ...profile,
      token
    })

    request.cookieAuth.set({ id: sessionId })

    return h.redirect('/')
  }
}
