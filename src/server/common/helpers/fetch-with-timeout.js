import fetch from 'node-fetch'

import { config } from '../../../config/config.js'

const API_KEY_HEADER = 'X-API-KEY'

/**
 * Build headers for requests to the AI DEFRA Search Agent API.
 * Always includes the X-API-KEY header for service-to-service authentication.
 *
 * @param {Object} [extraHeaders={}] - Additional headers to merge in
 * @param {string} apiKeyConfigKey - Config key to read the API key from
 * @returns {Object} Merged headers object including X-API-KEY
 */
export function buildApiHeaders (extraHeaders = {}, apiKeyConfigKey) {
  return {
    [API_KEY_HEADER]: config.get(apiKeyConfigKey),
    ...extraHeaders
  }
}

/**
 * Fetch with automatic timeout handling using AbortController
 *
 * @param {string} url - The URL to fetch
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} The fetch response
 * @throws {Error} If the request times out or fails
 */
export async function fetchWithTimeout (url, timeoutMs, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}
