import { createLogger } from '../common/helpers/logging/logger.js'
import { config } from '../../config/config.js'

let cacheInstance = null
let cacheTtl = null

function initializeUploadSessionCache (server) {
  cacheInstance = server.app.cache
  cacheTtl = config.get('session.cache.ttl')
}

function getCache () {
  if (!cacheInstance) {
    throw new Error('Upload session cache not initialized. Call initializeUploadSessionCache(server) first.')
  }
  return cacheInstance
}

function getCacheKey (uploadReference) {
  return `upload-session:${uploadReference}`
}

async function storeUploadSession (uploadReference, sessionData) {
  const logger = createLogger()
  const cache = getCache()

  try {
    await cache.set(getCacheKey(uploadReference), sessionData, cacheTtl)
  } catch (error) {
    logger.error({ error, uploadReference }, 'Failed to store upload session in cache')
  }
}

async function getUploadSession (uploadReference) {
  const logger = createLogger()
  const cache = getCache()

  if (!uploadReference) {
    return null
  }

  try {
    const cached = await cache.get(getCacheKey(uploadReference))
    return cached ?? null
  } catch (error) {
    logger.error({ error, uploadReference }, 'Error retrieving upload session from cache')
    return null
  }
}

export { initializeUploadSessionCache, storeUploadSession, getUploadSession }
