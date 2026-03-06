import { describe, test, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../../src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn() })
}))

const { initializeUploadSessionCache, storeUploadSession, getUploadSession } = await import('../../../../src/server/upload/upload-session-cache.js')

describe('upload-session-cache', () => {
  let mockCache

  beforeEach(() => {
    mockCache = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn()
    }
    initializeUploadSessionCache({ app: { cache: mockCache } })
  })

  test('stores and retrieves session data', async () => {
    const sessionData = { uploadId: 'abc123', statusUrl: 'http://cdp/status/abc123', knowledgeGroupId: 'group-1' }
    mockCache.get.mockResolvedValue(sessionData)

    await storeUploadSession('ref-123', sessionData)
    const result = await getUploadSession('ref-123')

    expect(mockCache.set).toHaveBeenCalledWith('upload-session:ref-123', sessionData, expect.any(Number))
    expect(mockCache.get).toHaveBeenCalledWith('upload-session:ref-123')
    expect(result).toEqual(sessionData)
  })

  test('returns null for an unknown key', async () => {
    mockCache.get.mockResolvedValue(null)

    const result = await getUploadSession('unknown-ref')

    expect(result).toBeNull()
  })

  test('logs error silently on cache failure', async () => {
    mockCache.set.mockRejectedValue(new Error('Cache error'))
    mockCache.get.mockRejectedValue(new Error('Cache error'))

    await expect(storeUploadSession('ref-123', {})).resolves.not.toThrow()
    const result = await getUploadSession('ref-123')
    expect(result).toBeNull()
  })
})
