import { config } from '../../config/config.js'
import { proxyFetch } from '../common/helpers/proxy/proxy-fetch.js'

export async function simulateUsage(payload) {
  const baseUrl = config.get('apiBaseUrl')
  const endpoint = '/observability/metrics/simulate-usage'
  const url = `${baseUrl}${endpoint}`
  const response = await proxyFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return await response.json()
}
