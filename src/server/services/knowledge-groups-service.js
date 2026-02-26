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

export async function createKnowledgeGroup (userId, { name, description }) {
  const base = knowledgeApiUrl()
  if (!base || !userId) {
    throw new Error('Knowledge API or user not configured')
  }
  const url = `${base.replace(/\/$/, '')}/knowledge-group`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-id': userId
    },
    body: JSON.stringify({ name, description: description || null })
  })
  if (!response.ok) {
    const body = await response.text()
    let detail
    try {
      detail = JSON.parse(body)?.detail
    } catch {
      detail = body
    }
    const err = new Error(`Knowledge API ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
    err.status = response.status
    err.detail = detail
    throw err
  }
  return response.json()
}
