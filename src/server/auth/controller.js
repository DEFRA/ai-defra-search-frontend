import { randomUUID as uuidv4 } from 'node:crypto'

/**
 * @typedef {Object} Profile
 * @property {string} id - UUID for the user, e.g. "12345678-aaaa-bbbb-cccc-000000000001"
 * @property {string} displayName - Full display name, e.g. "Jane Smith (Corporation Ltd)"
 * @property {string} email - Email address, e.g. "jane.smith@corp.com"
 */

/**
 * @param {Profile} profile
 * @param {string} token
 * @returns {{ isAuthenticated: boolean, id: string, displayName: string, email: string, token: string }}
 */
function buildSession (profile, token) {
  return { isAuthenticated: true, ...profile, token }
}

export const authController = {
  async handler (request, h) {
    if (!request.auth.isAuthenticated) {
      throw new Error('Authentication failed')
    }

    const { profile, token } = request.auth.credentials
    const sessionId = uuidv4()

    await request.server.app.cache.set(sessionId, buildSession(profile, token))

    request.cookieAuth.set({ id: sessionId })

    return h.redirect('/')
  }
}
