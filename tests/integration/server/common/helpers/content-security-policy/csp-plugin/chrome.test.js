import Hapi from '@hapi/hapi'

import { cspPlugin } from '../../../../../../../src/server/common/helpers/content-security-policy/plugin/csp-plugin.js'
import { userAgentParser } from '../../../../../../../src/server/common/helpers/user-agent.js'

describe('Chrome Content Security Policies', () => {
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

  test('sends defaults for chrome > 25', async () => {
    const ua = 'Mozilla/5.0 (Linux; Android 4.1.2; Archos 80 Xenon Build/JZO54K) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.58 Safari/537.31'

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

  test('sends defaults for chrome < 14', async () => {
    const ua = 'Mozilla/5.0 (X11; FreeBSD i386) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.112 Safari/535.1'

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

  test('sends x-webkit-csp for > 14 and < 25', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 5.0) AppleWebKit/5351 (KHTML, like Gecko) Chrome/15.0.849.0 Safari/5351'

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
})
