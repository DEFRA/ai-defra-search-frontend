import { describe, test, expect } from 'vitest'

import { home } from '../../../../src/server/home/index.js'

describe('home', () => {
  test('serves the homepage at the root URL', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    home.plugin.register(mockServer)

    const rootRoute = routes.find(r => r.method === 'GET' && r.path === '/')
    expect(rootRoute).toBeDefined()
    expect(rootRoute.handler).toBeDefined()
  })
})
