import { createServer } from '../../server.js'
import { config } from '../../../config/config.js'

async function startServer({ port } = {}) {
  const server = await createServer({ port })
  await server.start()

  const actualPort = server.info.port || config.get('port')
  server.logger.info('Server started successfully')
  server.logger.info(`Access your frontend on http://localhost:${actualPort}`)

  return server
}

export { startServer }
