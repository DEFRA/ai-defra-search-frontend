import path from 'path'
import hapi from '@hapi/hapi'
import cookie from '@hapi/cookie'
import Scooter from '@hapi/scooter'

import { AUTH } from './common/helpers/auth.js'
import { router } from './router.js'
import { config } from '../config/config.js'
import { PULSE } from './common/helpers/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '../config/nunjucks/nunjucks.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { SESSION_CACHE } from './common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { CONTENT_SECURITY_POLICY } from './common/helpers/content-security-policy.js'
import { userAgentProtection } from './common/helpers/user-agent-protection.js'

export async function createServer () {
  setupProxy()
  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ],
    state: {
      strictHeader: false
    }
  })

  await server.register([
    userAgentProtection, // needs to be registered before Scooter to intercept User-Agent header early
    cookie,
    requestLogger,
    requestTracing,
    secureContext,
    PULSE,
    SESSION_CACHE,
    nunjucksConfig,
    Scooter,
    CONTENT_SECURITY_POLICY,
    AUTH,
    router
  ])

  server.app.cache = server.cache({
    cache: config.get('session.cache.name'),
    segment: config.get('session.cache.segment'),
    expiresIn: config.get('session.cache.ttl')
  })

  server.ext('onPreResponse', catchAll)

  return server
}
