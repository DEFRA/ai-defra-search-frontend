import { describe, test, expect } from 'vitest'

import { start } from '../../../../src/server/start/index.js'

describe('start plugin', () => {
  test('should have plugin name "start"', () => {
    expect(start.plugin.name).toBe('start')
  })

  test('should register routes', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        if (Array.isArray(routeConfig)) {
          routes.push(...routeConfig)
        } else {
          routes.push(routeConfig)
        }
      }
    }

    start.plugin.register(mockServer)

    expect(routes).toHaveLength(5)
  })

  test('should register GET /start/{conversationId?} route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        if (Array.isArray(routeConfig)) {
          routes.push(...routeConfig)
        } else {
          routes.push(routeConfig)
        }
      }
    }

    start.plugin.register(mockServer)

    const getStartRoute = routes.find(r => r.method === 'GET' && r.path === '/start/{conversationId?}')
    expect(getStartRoute).toBeDefined()
    expect(getStartRoute.handler).toBeDefined()
  })

  test('should register POST /start/{conversationId?} route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        if (Array.isArray(routeConfig)) {
          routes.push(...routeConfig)
        } else {
          routes.push(routeConfig)
        }
      }
    }

    start.plugin.register(mockServer)

    const postStartRoute = routes.find(r => r.method === 'POST' && r.path === '/start/{conversationId?}')
    expect(postStartRoute).toBeDefined()
    expect(postStartRoute.handler).toBeDefined()
    expect(postStartRoute.options).toBeDefined()
  })

  test('should register GET /start/clear/{conversationId?} route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        if (Array.isArray(routeConfig)) {
          routes.push(...routeConfig)
        } else {
          routes.push(routeConfig)
        }
      }
    }

    start.plugin.register(mockServer)

    const clearRoute = routes.find(r => r.path === '/start/clear/{conversationId?}')
    expect(clearRoute).toBeDefined()
    expect(clearRoute.method).toEqual(['GET'])
    expect(clearRoute.handler).toBeDefined()
  })
})
