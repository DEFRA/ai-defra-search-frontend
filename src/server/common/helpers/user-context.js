import { AsyncLocalStorage } from 'node:async_hooks'

const asyncLocalStorage = new AsyncLocalStorage()

export const getUserId = () => asyncLocalStorage.getStore()?.get('userId') ?? null

/**
 * Test helper: run a function inside an async context with userId set.
 * @param {string|null} userId
 * @param {Function} fn
 */
export function run (userId, fn) {
  const store = new Map()
  if (userId !== null && userId !== undefined) {
    store.set('userId', userId)
  }
  return asyncLocalStorage.run(store, fn)
}

export const userContext = {
  plugin: {
    name: 'user-context',
    register (server) {
      server.ext('onRequest', (request, h) => {
        const store = new Map()
        const lifecycle = request._lifecycle.bind(request)
        request._lifecycle = () => asyncLocalStorage.run(store, lifecycle)
        return h.continue
      })

      server.ext('onCredentials', (request, h) => {
        const store = asyncLocalStorage.getStore()
        if (store && request.auth?.credentials?.id) {
          store.set('userId', request.auth.credentials.id)
        }
        return h.continue
      })
    }
  }
}
