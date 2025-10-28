import { getByEmail } from '../../api-requests/users.js'
import { config } from '../../../config/config.js'
import { get, set } from '../../session/index.js'
import { userData } from '../../session/keys.js'

const { emailAddress: emailAddressKey } = userData

const sessionConfig = config.get('session')
const cookieConfig = sessionConfig.cookie

const magicLinkAuth = {
  plugin: {
    name: 'auth',
    register: async (server, _) => {
      server.auth.strategy('session', 'cookie', {
        cookie: {
          isSameSite: cookieConfig.isSameSite,
          isSecure: cookieConfig.secure,
          name: cookieConfig.cookieNameAuth,
          password: cookieConfig.password,
          path: '/',
          ttl: cookieConfig.ttl
        },
        keepAlive: true,
        redirectTo: (request) => {
          return '/login'
        },
        validate: async (request, session) => {
          const result = { isValid: false }

          if (get(request, emailAddressKey)) {
            result.isValid = true
          } else {
            const email = (await getByEmail(session.email)) ?? {}
            set(request, emailAddressKey, email)
            result.isValid = !!email
          }

          return result
        }
      })
      server.auth.default({ strategy: 'session', mode: 'required' })
    }
  }
}

export { magicLinkAuth }
