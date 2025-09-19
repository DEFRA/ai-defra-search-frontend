import { ProxyAgent } from 'undici'
import { config } from '../../../../config/config.js'

/**
 * Fetch function that uses proxy when HTTP_PROXY is configured.
 * Node.js native fetch requires the proxy to be set on every request.
 *
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export function proxyFetch(url, options) {
  const proxyUrlConfig = config.get('httpProxy') // bound to HTTP_PROXY

  if (!proxyUrlConfig) {
    return fetch(url, options)
  }

  return fetch(url, {
    ...options,
    dispatcher: new ProxyAgent({
      uri: proxyUrlConfig,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10
    })
  })
}
