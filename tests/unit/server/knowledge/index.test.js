import { describe, test, expect } from 'vitest'

import { knowledge } from '../../../../src/server/knowledge/index.js'

describe('knowledge plugin', () => {
  test('should have plugin name "knowledge"', () => {
    expect(knowledge.plugin.name).toBe('knowledge')
  })

  test('should register routes', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    expect(routes).toHaveLength(9)
  })

  test('should register GET /knowledge route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'GET' && r.path === '/knowledge')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register GET /knowledge/add route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'GET' && r.path === '/knowledge/add')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register POST /knowledge/add route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'POST' && r.path === '/knowledge/add')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
    expect(route.options?.validate).toBeDefined()
  })

  test('should register GET /knowledge/{groupId} route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'GET' && r.path === '/knowledge/{groupId}')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register POST /knowledge/{groupId}/ingest route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'POST' && r.path === '/knowledge/{groupId}/ingest')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register POST /knowledge/{groupId}/sources/add route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.method === 'POST' && r.path === '/knowledge/{groupId}/sources/add')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register POST /knowledge/{groupId}/sources/{sourceId}/remove route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.path === '/knowledge/{groupId}/sources/{sourceId}/remove')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register POST /knowledge/{groupId}/snapshots/{snapshotId}/activate route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.path === '/knowledge/{groupId}/snapshots/{snapshotId}/activate')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
  })

  test('should register POST /knowledge/{groupId}/query route', () => {
    const routes = []
    const mockServer = {
      route (routeConfig) {
        routes.push(...(Array.isArray(routeConfig) ? routeConfig : [routeConfig]))
      }
    }

    knowledge.plugin.register(mockServer)

    const route = routes.find(r => r.path === '/knowledge/{groupId}/query')
    expect(route).toBeDefined()
    expect(route.handler).toBeDefined()
    expect(route.options?.validate).toBeDefined()
  })
})
