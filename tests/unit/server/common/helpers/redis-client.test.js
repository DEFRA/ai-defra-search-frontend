import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '../../../../../src/config/config.js'
import { buildRedisClient } from '../../../../../src/server/common/helpers/redis-client.js'

const hoisted = vi.hoisted(() => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }

  return {
    logger,
    redisCalls: [],
    clusterCalls: [],
    redisHandlers: [],
    clusterHandlers: []
  }
})

vi.mock('../../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => hoisted.logger)
}))

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(function (...args) {
    const handlers = {}
    hoisted.clusterCalls.push(args)
    hoisted.clusterHandlers.push(handlers)

    const client = {
      on: vi.fn((event, callback) => {
        handlers[event] = callback
        return client
      })
    }

    return client
  }),
  Redis: vi.fn(function (options) {
    const handlers = {}
    hoisted.redisCalls.push(options)
    hoisted.redisHandlers.push(handlers)

    const client = {
      on: vi.fn((event, callback) => {
        handlers[event] = callback
        return client
      })
    }

    return client
  })
}))

describe('#buildRedisClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.redisCalls.length = 0
    hoisted.clusterCalls.length = 0
    hoisted.redisHandlers.length = 0
    hoisted.clusterHandlers.length = 0
  })

  test('instantiates single Redis client with defaults and no credentials/tls', () => {
    buildRedisClient(config.get('redis'))

    expect(Redis).toHaveBeenCalledTimes(1)
    const options = hoisted.redisCalls[0]

    expect(options).toEqual(expect.objectContaining({
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
    }))

    expect(options).not.toHaveProperty('username')
    expect(options).not.toHaveProperty('password')
    expect(options).not.toHaveProperty('tls')
  })

  test('includes credentials and tls for single instance when configured', () => {
    buildRedisClient({
      ...config.get('redis'),
      username: 'user',
      password: 'pass',
      useTLS: true
    })

    const options = hoisted.redisCalls[0]
    expect(options.username).toBe('user')
    expect(options.password).toBe('pass')
    expect(options.tls).toEqual({})
  })

  test('single retry strategy returns delays and logs warn after max retries', () => {
    buildRedisClient({
      ...config.get('redis'),
      maxRetriesPerRequest: 3
    })

    const retryStrategy = hoisted.redisCalls[0].retryStrategy
    expect(retryStrategy(1)).toBe(50)
    expect(retryStrategy(3)).toBe(150)
    expect(retryStrategy(4)).toBeNull()
    expect(hoisted.logger.warn).toHaveBeenCalledWith('Redis max connection retries reached, giving up')
  })

  test('instantiates Redis cluster with expected options including retry strategy', () => {
    buildRedisClient({
      ...config.get('redis'),
      useSingleInstanceCache: false,
      useTLS: true,
      username: 'user',
      password: 'pass'
    })

    expect(Cluster).toHaveBeenCalledTimes(1)
    const [nodes, clusterOptions] = hoisted.clusterCalls[0]

    expect(nodes).toEqual([{ host: config.get('redis.host'), port: 6379 }])
    expect(clusterOptions).toEqual(expect.objectContaining({
      keyPrefix: 'ai-defra-search-frontend:',
      slotsRefreshTimeout: 10000,
      dnsLookup: expect.any(Function),
      clusterRetryStrategy: expect.any(Function),
      redisOptions: expect.objectContaining({
        db: 0,
        username: 'user',
        password: 'pass',
        tls: {},
        connectTimeout: expect.any(Number),
        commandTimeout: expect.any(Number),
        keepAlive: expect.any(Number),
        enableReadyCheck: expect.any(Boolean),
        maxRetriesPerRequest: expect.any(Number)
      })
    }))
  })

  test('cluster dnsLookup returns the same address', () => {
    buildRedisClient({
      ...config.get('redis'),
      useSingleInstanceCache: false
    })

    const [, clusterOptions] = hoisted.clusterCalls[0]
    const callback = vi.fn()
    clusterOptions.dnsLookup('redis.local', callback)

    expect(callback).toHaveBeenCalledWith(null, 'redis.local')
  })

  test('cluster retry strategy logs cluster warning after max retries', () => {
    buildRedisClient({
      ...config.get('redis'),
      useSingleInstanceCache: false,
      maxRetriesPerRequest: 2
    })

    const [, clusterOptions] = hoisted.clusterCalls[0]
    expect(clusterOptions.clusterRetryStrategy(1)).toBe(50)
    expect(clusterOptions.clusterRetryStrategy(3)).toBeNull()
    expect(hoisted.logger.warn).toHaveBeenCalledWith('Redis cluster max connection retries reached, giving up')
  })

  test('registers connect handler that logs success', () => {
    buildRedisClient(config.get('redis'))

    const handlers = hoisted.redisHandlers[0]
    handlers.connect()

    expect(hoisted.logger.info).toHaveBeenCalledWith('Connected to Redis server')
  })

  test('registers error handler that logs error details', () => {
    buildRedisClient({
      ...config.get('redis'),
      useSingleInstanceCache: false
    })

    const handlers = hoisted.clusterHandlers[0]
    handlers.error('boom')

    expect(hoisted.logger.error).toHaveBeenCalledWith('Redis connection error boom')
  })
})
