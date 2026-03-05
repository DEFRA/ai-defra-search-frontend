import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'
import { fetchWithTimeout } from '../../../../../src/server/common/helpers/fetch-with-timeout.js'

describe('fetchWithTimeout', () => {
  const testUrl = 'http://test-api.example.com'

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  test('should successfully fetch when response is within timeout', async () => {
    nock(testUrl)
      .get('/test')
      .reply(200, { success: true })

    const response = await fetchWithTimeout(`${testUrl}/test`, {}, 5000)
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(data).toEqual({ success: true })
  })

  test('should timeout when response exceeds timeout duration', async () => {
    nock(testUrl)
      .get('/slow')
      .delay(2000)
      .reply(200, { success: true })

    await expect(
      fetchWithTimeout(`${testUrl}/slow`, {}, 100)
    ).rejects.toThrow()
  }, 5000)

  test('should pass through fetch options', async () => {
    let capturedHeaders
    nock(testUrl)
      .post('/data')
      .reply(function (uri, body) {
        capturedHeaders = this.req.headers
        return [201, { created: true }]
      })

    await fetchWithTimeout(`${testUrl}/data`, {
      method: 'POST',
      headers: { 'x-custom-header': 'test-value' },
      body: JSON.stringify({ test: 'data' })
    }, 5000)

    expect(capturedHeaders['x-custom-header']).toBe('test-value')
  })

  test('should clear timeout after successful response', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    nock(testUrl)
      .get('/fast')
      .reply(200, { success: true })

    await fetchWithTimeout(`${testUrl}/fast`, {}, 5000)

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  test('should clear timeout even when request fails', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    nock(testUrl)
      .get('/error')
      .reply(500, 'Internal Server Error')

    await fetchWithTimeout(`${testUrl}/error`, {}, 5000)

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  test('should handle network errors', async () => {
    nock(testUrl)
      .get('/network-error')
      .replyWithError('Network error')

    await expect(
      fetchWithTimeout(`${testUrl}/network-error`, {}, 5000)
    ).rejects.toThrow('Network error')
  })
})
