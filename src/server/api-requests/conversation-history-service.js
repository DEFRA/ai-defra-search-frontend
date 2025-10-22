import { config } from '../../config/config.js'
import { proxyFetch } from '../common/helpers/proxy/proxy-fetch.js'

export class ConversationHistoryService {
  static formatTranscript(conversationHistory) {
    if (!conversationHistory || !Array.isArray(conversationHistory.messages)) {
      return 'No transcript available.'
    }
    return conversationHistory.messages
      .map((msg) => {
        let block = `Role: ${msg.role}\nContent: ${msg.content || ''}`
        if (msg.answer) {
          block += `\nAI: ${msg.answer}`
        }
        if (msg.timestamp) {
          block += `\nTime: ${msg.timestamp}`
        }
        if (
          msg.sources &&
          Array.isArray(msg.sources) &&
          msg.sources.length > 0
        ) {
          block += `\nSources:`
          msg.sources.forEach((src) => {
            block += `\n- ${src.title?.trim() || 'Untitled'}: ${src.url || ''}`
          })
        }
        return block + '\n'
      })
      .join('\n')
  }
  constructor() {
    this.baseUrl = config.get('apiBaseUrl')
    this.endpoint = '/conversation-history'
  }

  async getConversationHistory(conversationId) {
    if (!conversationId) {
      throw new Error('conversationId is required')
    }
    const url = `${this.baseUrl}${this.endpoint}/${conversationId}`
    try {
      const response = await proxyFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      return data
    } catch (error) {
      console.error('Failed to fetch conversation history:', error)
      throw error
    }
  }
}

export const conversationHistoryService = new ConversationHistoryService()
