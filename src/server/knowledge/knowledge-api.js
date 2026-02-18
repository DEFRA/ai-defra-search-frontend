import fetch from 'node-fetch'

import { config } from '../../config/config.js'

const dataApiUrl = () => config.get('dataApiUrl')
const HTTP_NO_CONTENT = 204

async function request (path, options = {}) {
  const base = dataApiUrl()
  if (!base) {
    const err = new Error('DATA_API_URL is not configured')
    err.status = 503
    throw err
  }
  const url = `${base}/${path.replace(/^\//, '')}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (!response.ok) {
    const body = await response.text()
    let detail
    try {
      detail = JSON.parse(body)?.detail
    } catch {
      detail = body
    }
    const err = new Error(`Data API ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
    err.status = response.status
    err.detail = detail
    throw err
  }
  if (response.status === HTTP_NO_CONTENT) {
    return []
  }
  return response.json()
}

async function listGroups () {
  return request('knowledge/groups')
}

async function getGroup (groupId) {
  return request(`knowledge/groups/${groupId}`)
}

async function listGroupSnapshots (groupId) {
  return request(`knowledge/groups/${groupId}/snapshots`)
}

async function createGroup (body) {
  return request('knowledge/groups', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      description: body.description,
      owner: body.owner,
      sources: body.sources.map(s => ({
        name: s.name,
        type: s.type,
        location: s.location
      }))
    })
  })
}

async function ingestGroup (groupId) {
  return request(`knowledge/groups/${groupId}/ingest`, { method: 'POST' })
}

async function addSourceToGroup (groupId, source) {
  return request(`knowledge/groups/${groupId}/sources`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: source.name,
      type: source.type,
      location: source.location
    })
  })
}

async function removeSourceFromGroup (groupId, sourceId) {
  return request(`knowledge/groups/${groupId}/sources/${sourceId}`, {
    method: 'DELETE'
  })
}

async function activateSnapshot (snapshotId) {
  return request(`snapshots/${snapshotId}/activate`, {
    method: 'PATCH'
  })
}

async function querySnapshot (groupId, query, maxResults = 5) {
  return request('snapshots/query', {
    method: 'POST',
    body: JSON.stringify({
      groupId,
      query,
      maxResults
    })
  })
}

export {
  listGroups,
  getGroup,
  listGroupSnapshots,
  createGroup,
  ingestGroup,
  addSourceToGroup,
  removeSourceFromGroup,
  activateSnapshot,
  querySnapshot
}
