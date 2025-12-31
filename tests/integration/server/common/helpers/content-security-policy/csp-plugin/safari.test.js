import Hapi from '@hapi/hapi'

import { cspPlugin } from '../../../../../../../src/server/common/helpers/content-security-policy/plugin/csp-plugin.js'
import { userAgentParser } from '../../../../../../../src/server/common/helpers/user-agent.js'

describe('Safari Content Security Policies', () => {
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

  test('sends defaults for >= 7.0', async () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9) AppleWebKit/537.71 (KHTML, like Gecko) Version/7.0 Safari/537.71 GM_UserLogon'

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'User-Agent': ua
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
  })

  test('sends x-webkit-csp for 6.0', async () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.26.17 (KHTML like Gecko) Version/6.0.2 Safari/536.26.17'

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'User-Agent': ua
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-webkit-csp']).toBeDefined()
    expect(res.headers['x-webkit-csp']).toContain('default-src \'none\'')
    expect(res.headers['x-webkit-csp']).toContain('script-src \'self\'')
    expect(res.headers['x-webkit-csp']).toContain('style-src \'self\'')
    expect(res.headers['x-webkit-csp']).toContain('img-src \'self\'')
    expect(res.headers['x-webkit-csp']).toContain('connect-src \'self\'')
  })

  test('sends x-webkit-csp for 5.0 if oldSafari = true', async () => {
    const ua = 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/533.20 (KHTML, like Gecko) Version/5.0.4 Safari/533.20'

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          oldSafari: true
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'User-Agent': ua
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-webkit-csp']).toBeDefined()
    expect(res.headers['x-webkit-csp']).toContain('default-src \'none\'')
    expect(res.headers['x-webkit-csp']).toContain('script-src \'self\'')
    expect(res.headers['x-webkit-csp']).toContain('style-src \'self\'')
    expect(res.headers['x-webkit-csp']).toContain('img-src \'self\'')
    expect(res.headers['x-webkit-csp']).toContain('connect-src \'self\'')
  })

  test('sends default header for 5.0 if oldSafari = false', async () => {
    const ua = 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/533.20 (KHTML, like Gecko) Version/5.0.4 Safari/533.20'

    await server.register([
      userAgentParser,
      cspPlugin
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'User-Agent': ua
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
  })
})
