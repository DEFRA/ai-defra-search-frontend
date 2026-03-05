import { randomUUID } from 'node:crypto'

import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { fetchWithTimeout } from '../common/helpers/fetch-with-timeout.js'

const logger = createLogger()

export async function initiateUpload ({ knowledgeGroupId }) {
  const cdpUploaderUrl = config.get('cdpUploaderUrl')
  const uploadBucketName = config.get('uploadBucketName')
  const cdpUploadCallbackUrl = config.get('cdpUploadCallbackUrl')
  const timeoutMs = config.get('cdpUploaderTimeoutMs')

  const uploadReference = randomUUID()

  const url = `${cdpUploaderUrl}/initiate`
  const body = {
    redirect: '/',
    callback: `${cdpUploadCallbackUrl}/${uploadReference}`,
    s3Bucket: uploadBucketName,
    s3Path: `uploads/${knowledgeGroupId}`,
    metadata: { knowledgeGroupId, uploadReference }
  }

  let response
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, timeoutMs)
  } catch (err) {
    logger.warn({ err }, 'CDP Uploader initiate failed')
    throw err
  }

  if (!response.ok) {
    logger.warn({ status: response.status }, 'CDP Uploader initiate failed')
    throw new Error(`CDP Uploader initiate failed with status ${response.status}`)
  }

  const data = await response.json()
  logger.info({ status: response.status, uploadId: data.uploadId, uploadReference }, 'CDP Uploader initiated')
  return { ...data, uploadReference }
}
