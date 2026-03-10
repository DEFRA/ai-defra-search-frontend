import { config } from '../../config/config.js'
import { getUserId } from '../common/helpers/user-context.js'
import { fetchWithTimeout } from '../common/helpers/fetch-with-timeout.js'

const knowledgeApiUrl = () => config.get('knowledgeApiUrl')

export async function listKnowledgeGroups () {
  const base = knowledgeApiUrl()
  const userId = getUserId()
  if (!base || !userId) {
    return []
  }
  const url = `${base.replace(/\/$/, '')}/knowledge-groups`
  const timeoutMs = config.get('knowledgeApiTimeoutMs')
  const headers = { 'Content-Type': 'application/json' }
  if (userId) { headers['user-id'] = userId }

  const response = await fetchWithTimeout(url, timeoutMs, { headers })

  if (!response.ok) {
    throw new Error(`Knowledge API ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

export async function createDocuments (documents) {
  const base = knowledgeApiUrl()
  if (!base) {
    throw new Error('Knowledge API URL is not configured')
  }
  const userId = getUserId()
  const url = `${base.replace(/\/$/, '')}/documents`
  const timeoutMs = config.get('knowledgeApiTimeoutMs')
  const headers = { 'Content-Type': 'application/json' }
  if (userId) { headers['user-id'] = userId }

  const response = await fetchWithTimeout(url, timeoutMs, {
    method: 'POST',
    headers,
    body: JSON.stringify(documents)
  })

  if (!response.ok) {
    throw new Error(`Knowledge API ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

export async function listDocumentsByKnowledgeGroup (knowledgeGroupId) {
  const base = knowledgeApiUrl()
  const userId = getUserId()
  if (!base || !userId) {
    return []
  }
  const url = `${base.replace(/\/$/, '')}/documents?knowledge_group_id=${encodeURIComponent(knowledgeGroupId)}`
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
  const timeoutMs = config.get('knowledgeApiTimeoutMs')
  const headers = { 'Content-Type': 'application/json' }
  if (userId) { headers['user-id'] = userId }

  const response = await fetchWithTimeout(url, timeoutMs, {
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
