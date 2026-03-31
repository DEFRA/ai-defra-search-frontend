import { describe, test, expect } from 'vitest'

import { accessibility } from '../../../../src/server/accessibility/index.js'

describe('accessibility plugin', () => {
  test('should have plugin name "accessibility"', () => {
    expect(accessibility.plugin.name).toBe('accessibility')
  })

  test('should register routes', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    accessibility.plugin.register(mockServer)

    expect(routes).toHaveLength(1)
  })

  test('should register GET /accessibility route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    accessibility.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'GET' && r.path === '/accessibility')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })
})
