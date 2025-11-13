import { config } from '../../../../config/config.js'

function _getCookieOptions () {
  return {
    cookie: {
      password: config.get('session.cookie.password'),
      isSecure: config.get('session.cookie.secure'),
      ttl: config.get('session.cookie.ttl')
    },
    redirectTo: '/login',
    validate: async (request, session) => {
      const userSession = await request.server.app.cache.get(session.id)

      if (!userSession) {
        return { isValid: false }
      }

      return { isValid: true, credentials: userSession }
    }
  }
}

const auth = {
  plugin: {
    name: 'auth',
    register: async (server) => {
      server.auth.strategy('session', 'cookie', _getCookieOptions())

      server.auth.default('session')
    }
  }
}

export { 
  auth
}
