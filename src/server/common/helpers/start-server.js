import { createServer } from '../../server.js'
import { config } from '../../../config/config.js'
import { getModels } from '../../services/models-service.js'

async function startServer () {
  const server = await createServer()
  await server.start()

  // Pre-warm connection to agent (skip in test)
  if (process.env.NODE_ENV !== 'test') {
    getModels().catch((err) => {
      server.logger.warn({ err }, 'Pre-warm models fetch failed (agent may not be ready)')
    })
  }

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
