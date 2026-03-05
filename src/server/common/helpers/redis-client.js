import { Cluster, Redis } from 'ioredis'

import { createLogger } from './logging/logger.js'

/**
 * Creates a retry strategy function for Redis connections
 * Uses exponential backoff: 50ms, 100ms, 150ms for retries 1, 2, 3
 *
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {Object} logger - Logger instance
 * @param {string} connectionType - Type of connection ('single' or 'cluster')
 * @returns {Function} Retry strategy function
 */
function createRetryStrategy (maxRetries, logger, connectionType = 'single') {
  return (times) => {
    if (times > maxRetries) {
      const message = connectionType === 'cluster'
        ? 'Redis cluster max connection retries reached, giving up'
        : 'Redis max connection retries reached, giving up'
      logger.warn(message)
      return null
    }

    return times * 50
  }
}

/**
 * Setup Redis and provide a redis client
 *
 * Local development - 1 Redis instance
 * Environments - Elasticache / Redis Cluster with username and password
 */
export function buildRedisClient (redisConfig) {
  const logger = createLogger()
  const port = 6379
  const db = 0
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      connectTimeout: redisConfig.connectTimeout,
      commandTimeout: redisConfig.commandTimeout,
      keepAlive: redisConfig.keepAlive,
      enableReadyCheck: redisConfig.enableReadyCheck,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      retryStrategy: createRetryStrategy(redisConfig.maxRetriesPerRequest, logger, 'single'),
      ...credentials,
      ...tls
    })
  } else {
    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 10000,
        dnsLookup: (address, callback) => callback(null, address),
        clusterRetryStrategy: createRetryStrategy(redisConfig.maxRetriesPerRequest, logger, 'cluster'),
        redisOptions: {
          db,
          connectTimeout: redisConfig.connectTimeout,
          commandTimeout: redisConfig.commandTimeout,
          keepAlive: redisConfig.keepAlive,
          enableReadyCheck: redisConfig.enableReadyCheck,
          maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
          ...credentials,
          ...tls
        }
      }
    )
  }

  redisClient.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  redisClient.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return redisClient
}
