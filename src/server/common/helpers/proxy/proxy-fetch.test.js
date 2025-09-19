import { describe, it, expect, vi } from 'vitest'
import { proxyFetch } from './proxy-fetch.js'
import { config } from '../../../../config/config.js'

// Mock the config module
vi.mock('../../../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

// Mock undici ProxyAgent
vi.mock('undici', () => ({
  ProxyAgent: vi.fn().mockImplementation((options) => ({
    uri: options.uri,
    keepAliveTimeout: options.keepAliveTimeout,
    keepAliveMaxTimeout: options.keepAliveMaxTimeout
  }))
}))

// Mock global fetch
global.fetch = vi.fn()

describe('proxyFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use regular fetch when no proxy is configured', async () => {
    // Arrange
    config.get.mockReturnValue(null)
    global.fetch.mockResolvedValue(new Response('test'))

    const url = 'https://example.com'
    const options = { method: 'GET' }

    // Act
    await proxyFetch(url, options)

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(url, options)
    expect(config.get).toHaveBeenCalledWith('httpProxy')
  })

  it('should use ProxyAgent when proxy is configured', async () => {
    // Arrange
    const proxyUrl = 'http://proxy.example.com:8080'
    config.get.mockReturnValue(proxyUrl)
    global.fetch.mockResolvedValue(new Response('test'))

    const url = 'https://example.com'
    const options = { method: 'POST', body: 'test' }

    // Act
    await proxyFetch(url, options)

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(url, {
      ...options,
      dispatcher: expect.objectContaining({
        uri: proxyUrl,
        keepAliveTimeout: 10,
        keepAliveMaxTimeout: 10
      })
    })
    expect(config.get).toHaveBeenCalledWith('httpProxy')
  })

  it('should preserve original options when using proxy', async () => {
    // Arrange
    const proxyUrl = 'http://proxy.example.com:8080'
    config.get.mockReturnValue(proxyUrl)
    global.fetch.mockResolvedValue(new Response('test'))

    const url = 'https://example.com'
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    }

    // Act
    await proxyFetch(url, options)

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
      dispatcher: expect.any(Object)
    })
  })
})
