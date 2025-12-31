import Hapi from '@hapi/hapi'

import { plugin as cspPlugin } from '../../../../../../../src/server/common/helpers/content-security-policy/plugin.js'
import { userAgentParser } from '../../../../../../../src/server/common/helpers/user-agent.js'

describe('Internet Explorer Content Security Policies', () => {
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

  test('sends nothing by default', async () => {
    const ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0; tb-webde/2.6.3)'

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
    expect(res.headers['x-content-security-policy']).toBe('')
  })

  test('sends sandbox headers if set', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Trident/7.0; ASU2JS; rv:11.0) like Gecko'

    await server.register([
      userAgentParser,
      {
        plugin: cspPlugin,
        options: {
          sandbox: 'allow-same-origin'
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
    expect(res.headers['x-content-security-policy']).toBeDefined()
    expect(res.headers['x-content-security-policy']).toBe('sandbox allow-same-origin')
  })
})
