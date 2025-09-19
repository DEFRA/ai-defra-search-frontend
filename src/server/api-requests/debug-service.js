import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { proxyFetch } from '../common/helpers/proxy/proxy-fetch.js'

const logger = createLogger('debugService')

export class DebugService {
  constructor() {
    this.baseUrl = config.get('apiBaseUrl')
    this.vectorStoreEndpoint = '/debug/vectorstore/chat'
    this.setupEndpoint = '/data/setup'
  }

  async searchVectorStore(question) {
    const payload = {
      question: question.trim()
    }

    logger.info(
      `Sending vector store request to API: ${this.baseUrl}${this.vectorStoreEndpoint}`
    )

    try {
      const response = await proxyFetch(
        `${this.baseUrl}${this.vectorStoreEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        logger.error(
          `Vector store API error! status: ${response.status}, statusText: ${response.statusText}`
        )
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      logger.info('Vector store API response received successfully')

      return {
        success: true,
        data
      }
    } catch (error) {
      logger.error('Error calling vector store API:', error)
      return {
        success: false,
        error:
          'Sorry, there was a problem processing your request. Please try again.'
      }
    }
  }

  async setupVectorStore(urls = []) {
    const payload = {
      urls
    }

    logger.info(
      `Sending setup request to API: ${this.baseUrl}${this.setupEndpoint}`
    )

    try {
      const response = await proxyFetch(
        `${this.baseUrl}${this.setupEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        logger.error(
          `Setup API error! status: ${response.status}, statusText: ${response.statusText}`
        )
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      logger.info('Setup API response received successfully')

      return {
        success: true,
        data
      }
    } catch (error) {
      logger.error('Error calling setup API:', error)
      return {
        success: false,
        error:
          'Sorry, there was a problem setting up the vector store. Please try again.'
      }
    }
  }
}

export const debugService = new DebugService()
