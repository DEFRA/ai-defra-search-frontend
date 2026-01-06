import Bell from '@hapi/bell'
import Jwt from '@hapi/jwt'

import { config } from '../../../config/config.js'

/**
 * @private
 * Creates a @type {Bell.BellOptions} object used to configure the 'azure'
 * authentication strategy using @package {@link https://hapi.dev/module/bell/ Bell}.
 *
 * This uses Microsoft Entra ID (formerly Azure AD) as the identity provider which
 * provides main auth strategy for the application.
 *
 * Bell provides built-in support for 'azure' as a provider.
 *
 * @returns {Bell.BellOptions}
 */
function _getBellOptions () {
  return {
    provider: 'azure',
    config: {
      tenant: config.get('auth.entra.tenantId')
    },
    clientId: config.get('auth.entra.clientId'),
    clientSecret: config.get('auth.entra.clientSecret'),
    location: config.get('auth.entra.redirectHost'),
    password: config.get('session.cookie.password'),
    isSecure: config.get('session.cookie.secure'),
    scope: ['openid', 'profile', 'User.Read']
  }
}

/**
 * @private
 * Creates a options object used to configure the 'session' authentication
 * strategy via @package {@link https://hapi.dev/module/cookie/ cookie}.
 *
 * This is used to maintain user sessions once authenticated via the
 * 'azure' strategy without triggering a complete OIDC authentication flow for
 * each request.
 *
 * @returns {object} CookieAuthOptions
 */
function _getCookieOptions () {
  return {
    cookie: {
      password: config.get('session.cookie.password'),
      path: '/',
      isSecure: config.get('session.cookie.secure'),
      ttl: config.get('session.cookie.ttl')
    },
    redirectTo: '/auth/callback',
    validate: _validateSessionToken
  }
}

/**
 * @private
 * Validates the authentication token issued by the identity provider
 * that is stored in the user session is still valid.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {object} session
 * @returns {Promise<{isValid: boolean, credentials?: object}>}
 */
async function _validateSessionToken (request, session) {
  const userSession = await request.server.app.cache.get(session.id)

  if (!userSession) {
    return { isValid: false }
  }

  try {
    const decoded = Jwt.token.decode(userSession.token)

    Jwt.token.verifyTime(decoded)
  } catch (err) {
    request.server.logger.info('Session JWT token is invalid or has expired')

    return { isValid: false }
  }

  return { isValid: true, credentials: userSession }
}

const AUTH = {
  plugin: {
    name: 'auth',
    register: async (server) => {
      await server.register(Bell)

      server.auth.strategy('session', 'cookie', _getCookieOptions())
      server.auth.strategy('azure', 'bell', _getBellOptions())

      if (config.get('auth.enabled')) {
        server.auth.default('session')
      }
    }
  }
}

export { AUTH }
