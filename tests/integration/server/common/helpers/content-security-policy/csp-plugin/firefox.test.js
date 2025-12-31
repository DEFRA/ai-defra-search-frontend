import Hapi from '@hapi/hapi'

import { cspPlugin } from '../../../../../../../src/server/common/helpers/content-security-policy/plugin/csp-plugin.js'
import { userAgentParser } from '../../../../../../../src/server/common/helpers/user-agent.js'

describe('Firefox Content Security Policies', () => {
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

  test('sends defaults for firefox > 23', async () => {
    const ua = 'Mozilla/5.0 (X11; Linux i686 on x86_64; rv:24.0) Gecko/20140708 Firefox/24.0'

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

    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
  })

  test('sends firefox specific headers for >= 5 < 24', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 6.1; rv:23.0; WUID=bf19fbc4a944f1db2c5020ffe8c3c372; WTB=3869) Gecko/20100101 Firefox/23.0'

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

    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['x-content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['x-content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['x-content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['x-content-security-policy']).toContain('xhr-src \'self\'')
  })

  test('sends allow instead of default-src for firefox 4', async () => {
    const ua = 'Mozilla/5.0 (X11; Linux i686; MW65549; rv:2.0.1) Gecko/20100101 Firefox/4.0.1'

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

    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).toContain('allow \'none\'')
    expect(res.headers['x-content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['x-content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['x-content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['x-content-security-policy']).toContain('xhr-src \'self\'')
  })

  test('sends defaults for firefox < 4', async () => {
    const ua = 'Mozilla/5.0 (Windows; U; Windows NT 5.0; en-GB; rv:1.9.0.19) Gecko/2010031422 Firefox/3.0.19'

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

    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(res.headers['content-security-policy']).toContain('script-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('style-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('img-src \'self\'')
    expect(res.headers['content-security-policy']).toContain('connect-src \'self\'')
  })

  test('replaces unsafe-inline with inline-script for older firefox', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 6.0; rv:22.0) Gecko/20100101 Firefox/22.0 DT-Browser/DTB7.022.0018'

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          scriptSrc: 'unsafe-inline'
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

    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).toContain('script-src \'inline-script\'')
  })

  test('replaces unsafe-eval with eval-script for older firefox', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 6.0; rv:22.0) Gecko/20100101 Firefox/22.0 DT-Browser/DTB7.022.0018'

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          scriptSrc: 'unsafe-eval'
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        'User-Agent': ua
      }
    })

    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).toContain('script-src \'eval-script\'')
  })

  test('removes unsafe-eval from non script-src directives', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 6.0; rv:22.0) Gecko/20100101 Firefox/22.0 DT-Browser/DTB7.022.0018'

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          objectSrc: ['self', 'unsafe-eval', 'unsafe-inline']
        }
      }
    ])

    const res = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        'User-Agent': ua
      }
    })

    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).toContain('object-src \'self\'')
  })

  test('doesn\'t set empty strings if invalid values are all removed', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 6.0; rv:22.0) Gecko/20100101 Firefox/22.0 DT-Browser/DTB7.022.0018'

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
    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).not.toContain('object-src')
  })
})
