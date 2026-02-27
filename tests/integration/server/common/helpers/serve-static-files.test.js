import { vi } from 'vitest'

import { statusCodes } from '../../../../../src/server/common/constants/status-codes.js'

describe('#serveStaticFiles', () => {
  let server
  let startServerImport

  beforeAll(async () => {
    vi.stubEnv('PORT', '3098')
    startServerImport = await import('../../../../../src/server/common/helpers/start-server.js')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe('When secure context is disabled', () => {
    beforeEach(async () => {
      server = await startServerImport.startServer()
    })

    afterEach(async () => {
      if (server) {
        await server.stop({ timeout: 0 })
        server = null
      }
    })

    test('Should serve favicon as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/favicon.ico'
      })

      expect(statusCode).toBe(statusCodes.noContent)
    })

    test('Should serve assets as expected', async () => {
      // Note npm run build is ran in the postinstall hook in package.json to make sure there is always a file
      // available for this test. Remove as you see fit
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/public/assets/images/govuk-crest.svg'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
