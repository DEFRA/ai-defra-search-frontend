import { AsyncLocalStorage } from 'node:async_hooks'

import { config } from '../../../config/config.js'
import { createLogger } from './logging/logger.js'

const asyncLocalStorage = new AsyncLocalStorage()
const logger = createLogger()

const DEV_USER_ID = 'local-dev-test'

export const getUserId = () => asyncLocalStorage.getStore()?.get('userId') ?? null
export const getSessionId = () => asyncLocalStorage.getStore()?.get('sessionId') ?? null

/**
 * Test helper: run a function inside an async context with userId and sessionId set.
 * @param {string|null} userId
 * @param {Function} fn
 * @param {string|null} [sessionId]
 */
export function run (userId, fn, sessionId) {
  const store = new Map()
  if (userId !== null && userId !== undefined) {
    store.set('userId', userId)
  }
  if (sessionId !== null && sessionId !== undefined) {
    store.set('sessionId', sessionId)
  }
  return asyncLocalStorage.run(store, fn)
}

export const userContext = {
  plugin: {
    name: 'user-context',
    register (server) {
      if (!config.get('auth.enabled')) {
        logger.warn({ devUserId: DEV_USER_ID }, 'Auth disabled — requests will use hardcoded dev user ID for user context')
      }

      server.ext('onRequest', (request, h) => {
        const store = new Map()
        // DEV ONLY: auth.enabled=false means no OIDC flow runs, so we inject
        // a hardcoded dev user ID. This branch never runs in production.
        if (!config.get('auth.enabled')) {
          store.set('userId', DEV_USER_ID)
        }
        const lifecycle = request._lifecycle.bind(request)
        request._lifecycle = () => asyncLocalStorage.run(store, lifecycle)
        return h.continue
      })

      server.ext('onCredentials', (request, h) => {
        const store = asyncLocalStorage.getStore()
        if (store) {
          if (request.auth?.credentials?.id) {
            store.set('userId', request.auth.credentials.id)
          }
          if (request.auth?.credentials?.sessionId) {
            store.set('sessionId', request.auth.credentials.sessionId)
          }
        }
        return h.continue
      })
    }
  }
}
