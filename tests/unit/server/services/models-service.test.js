import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'

import { getModels, clearModelsCache } from '../../../../src/server/services/models-service.js'
import { config } from '../../../../src/config/config.js'

describe('models-api', () => {
  const chatApiUrl = config.get('chatApiUrl')

  beforeEach(() => {
    nock.cleanAll()
    clearModelsCache()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  test('should fetch and return models', async () => {
    nock(chatApiUrl)
      .get('/models')
      .reply(200, [{ modelId: 'm1', modelName: 'Model 1' }])

    const result = await getModels()

    expect(result).toHaveLength(1)
    expect(result[0].modelId).toBe('m1')
  })

  test('should use cache when data is fresh', async () => {
    nock(chatApiUrl)
      .get('/models')
      .reply(200, [{ modelId: 'm1' }])

    const first = await getModels()
    const second = await getModels()

    expect(first).toEqual(second)
    expect(nock.pendingMocks()).toHaveLength(0)
  })

  test('should not update cache when cleared during fetch', async () => {
    nock(chatApiUrl)
      .get('/models')
      .reply(200, () => {
        clearModelsCache()
        return [{ modelId: 'stale' }]
      })

    const result = await getModels()
    expect(result[0].modelId).toBe('stale')

    nock(chatApiUrl)
      .get('/models')
      .reply(200, [{ modelId: 'fresh' }])

    const afterClear = await getModels()
    expect(afterClear[0].modelId).toBe('fresh')
  })

  test('should throw when API returns error', async () => {
    nock(chatApiUrl)
      .get('/models')
      .reply(500, 'Internal error')

    await expect(getModels()).rejects.toThrow('Models API returned 500')
  })

  test('should throw on network error', async () => {
    nock(chatApiUrl)
      .get('/models')
      .replyWithError('ECONNREFUSED')

    await expect(getModels()).rejects.toThrow('Failed to connect to models API')
  })
})
