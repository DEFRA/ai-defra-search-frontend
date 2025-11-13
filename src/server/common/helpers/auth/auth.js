import { config } from '../../../../config/config.js'

const users = {}

const auth = {
  plugin: {
    name: 'auth',
    register: async (server) => {
      server.auth.strategy('session', 'cookie', {
        cookie: {
          name: 'session-id',
          password: config.get('session.cookie.password'),
          isSecure: config.get('session.cookie.secure'),
          ttl: config.get('session.cookie.ttl')
        },
        redirectTo: '/login',
        validate: async (request, session) => {
          const account = users[session.id]

          if (!account) {
            return { valid: false }
          }

          return { valid: true, credentials: account }
        }
      })

      server.auth.default('session')
    }
  }
}

export { 
  auth
}
