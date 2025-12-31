import Hapi from '@hapi/hapi'

import { plugin as cspPlugin } from '../../../../../../../src/server/common/helpers/content-security-policy/plugin/plugin.js'
import { userAgentParser } from '../../../../../../../src/server/common/helpers/user-agent.js'

describe('Generic CSP Headers', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()

    server.route({
      method: 'GET',
      path: '/',
      handler: (_request, h) => {
        return h.response({ message: 'ok' })
      }
    })

    await server.initialize()
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  test('sends default headers', async () => {
    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('base-uri \'self\'')
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\' \'nonce-')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('worker-src \'self\'')
  })

  test('allows setting base-uri', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          baseUri: ['unsafe-inline', 'https://hapijs.com', 'blob:']
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('base-uri \'unsafe-inline\' https://hapijs.com blob:')
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\' \'nonce-')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('worker-src \'self\'')
  })

  test('allows setting unsafe-inline in combination with nonce on script-src', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          scriptSrc: ['unsafe-inline']
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'unsafe-inline\' \'nonce-')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('worker-src \'self\'')
  })

  test('allows settings strict-dynamic with corresponding nonces', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          scriptSrc: ['strict-dynamic'],
          styleSrc: ['strict-dynamic'],
          generateNonces: true
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('script-src \'strict-dynamic\' \'nonce-')
    expect(res.headers['content-security-policy']).toContain('style-src \'strict-dynamic\' \'nonce-')
  })

  test('allows creating nonces for only script-src', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          generateNonces: 'script'
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('script-src \'self\' \'nonce-')
    expect(res.headers['content-security-policy']).not.toContain('style-src \'self\' \'nonce-')
  })

  test('allows creating nonces for only style-src', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          generateNonces: 'style'
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('style-src \'self\' \'nonce-')
    expect(res.headers['content-security-policy']).not.toContain('script-src \'self\' \'nonce-')
  })

  test('sets headers when content-type is set and is text/html', async () => {
    server.route({
      method: 'GET',
      path: '/html',
      handler: (_request, h) => {
        return h.response('test').type('text/html')
      }
    })

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/html'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
  })

  test('does not set headers when content-type is set and is not text/html', async () => {
    server.route({
      method: 'GET',
      path: '/json',
      handler: (_request, h) => {
        return h.response({ some: 'body' }).type('application/json')
      }
    })

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/json'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeUndefined()
  })

  test('sends default headers when scooter is not loaded', async () => {
    await server.register(cspPlugin)

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('worker-src \'self\'')
  })

  test('sends report only headers when requested', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          defaultSrc: 'self',
          reportOnly: true,
          reportUri: '/csp_report'
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy-report-only']).toBeDefined()
    expect(res.headers['content-security-policy-report-only']).toContain('default-src \'self\'')
    expect(res.headers['content-security-policy-report-only']).toContain('report-uri /csp_report')
  })

  test('does not crash when responding with an error', async () => {
    server.route({
      method: 'GET',
      path: '/error',
      handler: () => {
        throw new Error('broken!')
      }
    })

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/error'
    })

    expect(res.statusCode).toBe(500)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('worker-src \'self\'')
  })

  test('allows setting the sandbox directive with no values', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          sandbox: true
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('sandbox')
  })

  test('allows setting array directives to a single string', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          defaultSrc: '*'
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src *')
  })

  test('allows setting array directives to an array of strings', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          defaultSrc: ['*', 'self']
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src * \'self\'')
  })

  test('exposes nonces on request.plugins.contentSecurityPolicy.nonces', async () => {
    server.route({
      method: 'GET',
      path: '/nonces',
      handler: (request) => {
        return request.plugins.contentSecurityPolicy.nonces
      }
    })

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          generateNonces: true
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/nonces'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toHaveProperty('style')
    expect(res.result).toHaveProperty('script')
    expect(typeof res.result.style).toBe('string')
    expect(typeof res.result.script).toBe('string')
  })

  test('skips headers on OPTIONS requests', async () => {
    server.route({
      method: 'OPTIONS',
      path: '/options',
      handler: () => {
        return ''
      }
    })

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          generateNonces: true
        }
      }
    ])

    const res = await server.inject({
      method: 'OPTIONS',
      url: '/options'
    })

    expect(res.statusCode).toBe(204)
    expect(res.headers['content-security-policy']).toBeUndefined()
  })

  test('does not throw on 404 when generating nonces', async () => {
    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          generateNonces: true
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/404'
    })

    expect(res.statusCode).toBe(404)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('script-src \'self\' \'nonce-')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\' \'nonce-')
  })

  test('can be disabled on a single route', async () => {
    server.route({
      method: 'GET',
      path: '/disabled',
      handler: () => {
        return 'disabled'
      },
      options: {
        plugins: {
          contentSecurityPolicy: false
        }
      }
    })

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const enabledCspResponse = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(enabledCspResponse.statusCode).toBe(200)
    expect(enabledCspResponse.headers['content-security-policy']).toBeDefined()
    expect(enabledCspResponse.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(enabledCspResponse.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(enabledCspResponse.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(enabledCspResponse.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(enabledCspResponse.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(enabledCspResponse.headers['content-security-policy']).toContain('worker-src \'self\'')

    const disabledCspResponse = await server.inject({
      method: 'GET',
      url: '/disabled'
    })

    expect(disabledCspResponse.statusCode).toBe(200)
    expect(disabledCspResponse.headers['content-security-policy']).toBeUndefined()
  })

  test('can be overridden on a single route', async () => {
    server.route({
      method: 'GET',
      path: '/overridden',
      handler: () => {
        return 'overridden'
      },
      options: {
        plugins: {
          contentSecurityPolicy: {
            defaultSrc: 'self'
          }
        }
      }
    })

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('worker-src \'self\'')

    const overriddenResponse = await server.inject({
      method: 'GET',
      url: '/overridden'
    })

    expect(overriddenResponse.statusCode).toBe(200)
    expect(overriddenResponse.headers['content-security-policy']).toBeDefined()
    expect(overriddenResponse.headers['content-security-policy']).toContain('default-src \'self\'')
  })

  test('self disables when a route override is invalid', async () => {
    server.route({
      method: 'GET',
      path: '/invalid',
      handler: () => {
        return 'invalid'
      },
      options: {
        plugins: {
          contentSecurityPolicy: {
            sandbox: 'self'
          }
        }
      }
    })

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const validResponse = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(validResponse.statusCode).toBe(200)
    expect(validResponse.headers['content-security-policy']).toBeDefined()
    expect(validResponse.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(validResponse.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(validResponse.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(validResponse.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(validResponse.headers['content-security-policy']).toContain('connect-src \'self\'')
    expect(validResponse.headers['content-security-policy']).toContain('worker-src \'self\'')

    const invalidResponse = await server.inject({
      method: 'GET',
      url: '/invalid'
    })

    expect(invalidResponse.statusCode).toBe(200)
    expect(invalidResponse.headers['content-security-policy']).toBeUndefined()
  })
})
