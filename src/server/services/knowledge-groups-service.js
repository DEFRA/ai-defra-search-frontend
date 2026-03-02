import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { getUserId } from '../common/helpers/user-context.js'

const knowledgeApiUrl = () => config.get('knowledgeApiUrl')

export async function listKnowledgeGroups () {
  const base = knowledgeApiUrl()
  const userId = getUserId()
  if (!base || !userId) {
    return []
  }
  const url = `${base.replace(/\/$/, '')}/knowledge-groups`
  const headers = { 'Content-Type': 'application/json' }
  if (userId) { headers['user-id'] = userId }
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`Knowledge API ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

export async function createKnowledgeGroup ({ name, description, informationAssetOwner }) {
  const base = knowledgeApiUrl()
  const userId = getUserId()
  if (!base || !userId) {
    throw new Error('Knowledge API or user not configured')
  }
  const url = `${base.replace(/\/$/, '')}/knowledge-group`
  const headers = { 'Content-Type': 'application/json' }
  if (userId) { headers['user-id'] = userId }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      description: description || null,
      information_asset_owner: informationAssetOwner || null
    })
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
