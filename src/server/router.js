import inert from '@hapi/inert'

import { chat } from './chat/router.js'
import { home } from './home/index.js'
import { about } from './about/index.js'
import { health } from './health/index.js'
import { debug } from './debug/index.js'
import { observability } from './observability/index.js'
import { usageSimulation } from './usage-simulation/index.js'
import { howWeGenerateAnswers } from './how-we-generate-answers/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        chat,
        home,
        about,
        debug,
        observability,
        usageSimulation,
        howWeGenerateAnswers
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
