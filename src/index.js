import process from 'node:process'
import { startServer } from './server/common/helpers/start-server.js'
import { createLogger } from './server/common/helpers/logging/logger.js'

// Connection pooling for fetch - avoids cold-connection latency to agent (skipped in test so nock can intercept)
if (process.env.NODE_ENV !== 'test') {
  const { Agent, setGlobalDispatcher } = await import('undici')
  setGlobalDispatcher(new Agent({ keepAliveTimeout: 30_000 }))
}

await startServer()

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
