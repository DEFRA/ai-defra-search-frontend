import fetch from 'node-fetch'

/**
 * Fetch with automatic timeout handling using AbortController
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>} The fetch response
 * @throws {Error} If the request times out or fails
 */
export async function fetchWithTimeout (url, options = {}, timeoutMs) {
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
