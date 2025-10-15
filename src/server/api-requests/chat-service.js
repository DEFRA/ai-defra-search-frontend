import { config } from '../../config/config.js'
import { proxyFetch } from '../common/helpers/proxy/proxy-fetch.js'

export class ChatService {
  constructor() {
    this.baseUrl = config.get('apiBaseUrl')
    this.chatEndpoint = '/v2/chat'
  }

  generateSessionId() {
    return crypto.randomUUID()
  }

  async sendQuestion(question, conversationId = null) {
    const payload = {
      question,
      conversationId: conversationId || null
    }

    console.log(`Sending request to API: ${this.baseUrl}${this.chatEndpoint}`)

    try {
      const response = await proxyFetch(`${this.baseUrl}${this.chatEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error(
          `HTTP error! status: ${response.status}, statusText: ${response.statusText}`
        )
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('API response received successfully')

      console.log('Raw API response data:', data)

      return {
        success: true,
        data: {
          conversationId: data.conversationId || null
        }
      }
    } catch (error) {
      console.error('Chat API request failed:', error)
      console.error('API URL:', `${this.baseUrl}${this.chatEndpoint}`)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      })
      return {
        success: false,
        error: error.message,
        conversationId: conversationId || null,
        conversationHistory: []
      }
    }
  }

  formatSourceDocuments(sourceDocuments) {
    if (!sourceDocuments || !Array.isArray(sourceDocuments)) {
      console.log('sourceDocuments is not a valid array, returning empty array')
      return []
    }

    const formatted = sourceDocuments.map((doc, index) => {
      console.log(`Processing doc ${index + 1}:`, doc)
      return {
        index: index + 1,
        id: doc.id,
        title: doc.metadata?.title?.trim() || 'Government Document',
        source: doc.metadata?.source || 'Unknown',
        language: doc.metadata?.language || 'en',
        content: doc.page_content || '',
        type: doc.type || 'Document'
      }
    })

    return formatted
  }

  formatUsage(usage) {
    if (!usage) {
      return null
    }

    const modelNames = Object.keys(usage).filter(
      (key) => key !== 'session_id' && key !== 'timestamp'
    )

    if (modelNames.length === 0) {
      return null
    }

    const models = modelNames.map((modelName) => {
      const modelUsage = usage[modelName]
      return {
        modelId: modelName,
        tokens: {
          input: modelUsage.input_tokens || 0,
          output: modelUsage.output_tokens || 0,
          total: modelUsage.total_tokens || 0
        },
        cacheDetails: modelUsage.input_token_details
          ? {
              cacheCreation: modelUsage.input_token_details.cache_creation || 0,
              cacheRead: modelUsage.input_token_details.cache_read || 0
            }
          : null
      }
    })

    const totalTokens = {
      input: models.reduce((sum, model) => sum + model.tokens.input, 0),
      output: models.reduce((sum, model) => sum + model.tokens.output, 0),
      total: models.reduce((sum, model) => sum + model.tokens.total, 0)
    }

    return {
      sessionId: usage.session_id || 'Not available',
      models,
      totalTokens,
      timestamp: usage.timestamp ? new Date(usage.timestamp) : null
    }
  }
}

export const chatService = new ChatService()
