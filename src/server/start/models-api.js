import fetch from 'node-fetch'

import { config } from '../../config/config.js'

/**
 * Fetches the list of available AI models from the API.
 *
 * @returns {Promise<Array>} Array of model objects with modelName and modelDescription
 * @throws {Error} If the API request fails
 */
async function getModels () {
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
    return data
  } catch (error) {
    throw new Error(`Failed to connect to models API at ${url}: ${error.message}`)
  }
}

export { getModels }
