import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '../../../../../src/config/config.js'
import { buildRedisClient } from '../../../../../src/server/common/helpers/redis-client.js'

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(function () {
    return { on: () => ({}) }
  }),
  Redis: vi.fn(function () {
    return { on: () => ({}) }
  })
}))

describe('#buildRedisClient', () => {
  describe('When Redis Single InstanceCache is requested', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      buildRedisClient(config.get('redis'))
    })

    test('Should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          db: 0,
          host: config.get('redis.host'),
          keyPrefix: 'ai-defra-search-frontend:',
          port: 6379,
          connectTimeout: expect.any(Number),
          commandTimeout: expect.any(Number),
          keepAlive: expect.any(Number),
          enableReadyCheck: expect.any(Boolean),
          maxRetriesPerRequest: expect.any(Number),
          retryStrategy: expect.any(Function)
        })
      )
    })
  })

  describe('When a Redis Cluster is requested', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      buildRedisClient({
        ...config.get('redis'),
        useSingleInstanceCache: false,
        useTLS: true,
        username: 'user',
        password: 'pass'
      })
    })

    test('Should instantiate a Redis Cluster client', () => {
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: config.get('redis.host'), port: 6379 }],
        expect.objectContaining({
          dnsLookup: expect.any(Function),
          keyPrefix: 'ai-defra-search-frontend:',
          clusterRetryStrategy: expect.any(Function),
          slotsRefreshTimeout: 10000,
          redisOptions: expect.objectContaining({
            db: 0,
            password: 'pass',
            username: 'user',
            tls: {},
            connectTimeout: expect.any(Number),
            commandTimeout: expect.any(Number),
            keepAlive: expect.any(Number),
            enableReadyCheck: expect.any(Boolean),
            maxRetriesPerRequest: expect.any(Number)
          })
        })
      )
    })
  })
})
