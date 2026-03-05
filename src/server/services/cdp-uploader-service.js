import { randomUUID } from 'node:crypto'
import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export async function initiateUpload ({ knowledgeGroupId }) {
  const cdpUploaderUrl = config.get('cdpUploaderUrl')
  const uploadBucketName = config.get('uploadBucketName')
  const cdpUploadCallbackUrl = config.get('cdpUploadCallbackUrl')

  const uploadReference = randomUUID()

  const url = `${cdpUploaderUrl}/initiate`
  const body = {
    redirect: `/upload-status/${uploadReference}`,
    callback: `${cdpUploadCallbackUrl}/${uploadReference}`,
    s3Bucket: uploadBucketName,
    s3Path: `uploads/${knowledgeGroupId}`,
    metadata: { knowledgeGroupId, uploadReference }
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    logger.warn({ uploadReference, err }, 'CDP upload initiate failed')
    throw err
  }

  if (!response.ok) {
    logger.warn({ uploadReference, status: response.status }, 'CDP upload initiate failed')
    throw new Error(`CDP upload initiate failed with status ${response.status}`)
  }

  const data = await response.json()
  logger.info({ uploadReference, uploadId: data.uploadId, statusUrl: data.statusUrl }, 'CDP upload initiated')
  return { ...data, uploadReference }
}

export async function fetchUploadStatus (statusUrl) {
  let response
  try {
    response = await fetch(statusUrl)
  } catch (err) {
    logger.warn({ statusUrl, err }, 'CDP upload status fetch failed')
    throw err
  }

  if (!response.ok) {
    logger.warn({ statusUrl, status: response.status }, 'CDP upload status fetch returned non-2xx')
    throw new Error(`CDP upload status fetch failed with status ${response.status}`)
  }

  return response.json()
}
