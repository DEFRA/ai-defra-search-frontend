import fetch from 'node-fetch'

import { config } from '../../config/config.js'

const MODELS_CACHE_TTL_MINUTES = 5
const MODELS_CACHE_TTL_MS = MODELS_CACHE_TTL_MINUTES * 60 * 1000
let modelsCache = { data: null, expiresAt: 0, version: 0 }

function clearModelsCache () {
  modelsCache = { data: null, expiresAt: 0, version: modelsCache.version + 1 }
}

/**
 * Fetches the list of available AI models from the API.
 * Uses in-memory cache to avoid repeated slow requests.
 *
 * @returns {Promise<Array>} Array of model objects with modelName and modelDescription
 * @throws {Error} If the API request fails
 */
async function getModels () {
  const now = Date.now()
  if (modelsCache.data && modelsCache.expiresAt > now) {
    return modelsCache.data
  }

  const versionAtStart = modelsCache.version
  const chatApiUrl = config.get('chatApiUrl')
  const url = `${chatApiUrl}/models`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Models API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (versionAtStart === modelsCache.version) {
      modelsCache = { data, expiresAt: now + MODELS_CACHE_TTL_MS, version: modelsCache.version }
    }
    return data
  } catch (error) {
    throw new Error(`Failed to connect to models API at ${url}: ${error.message}`)
  }
}

export { getModels, clearModelsCache }
