import fetch from 'node-fetch'

import { config } from '../../config/config.js'

const knowledgeApiUrl = () => config.get('knowledgeApiUrl')

export async function listKnowledgeGroups (userId) {
  const base = knowledgeApiUrl()
  if (!base || !userId) {
    return []
  }
  const url = `${base.replace(/\/$/, '')}/knowledge-groups`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'user-id': userId
    }
  })
  if (!response.ok) {
    throw new Error(`Knowledge API ${response.status}: ${await response.text()}`)
  }
  return response.json()
}
