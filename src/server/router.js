import inert from '@hapi/inert'

import { authRoutes } from './auth/index.js'
import { feedback } from './feedback/index.js'
import { knowledge } from './knowledge/index.js'
import { start } from './start/index.js'
import { health } from './health/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register (server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([authRoutes, feedback, knowledge, start])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
