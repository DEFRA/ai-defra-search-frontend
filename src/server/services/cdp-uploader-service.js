import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export async function initiateUpload ({ knowledgeGroupId }) {
  const cdpUploaderUrl = config.get('cdpUploaderUrl')
  const uploadBucketName = config.get('uploadBucketName')

  const url = `${cdpUploaderUrl}/initiate`
  const body = {
    redirect: '/',
    s3Bucket: uploadBucketName,
    s3Path: `uploads/${knowledgeGroupId}`,
    metadata: { knowledgeGroupId }
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    logger.warn({ err }, 'CDP Uploader initiate failed')
    throw err
  }

  if (!response.ok) {
    logger.warn({ status: response.status }, 'CDP Uploader initiate failed')
    throw new Error(`CDP Uploader initiate failed with status ${response.status}`)
  }

  const data = await response.json()
  logger.info({ status: response.status, uploadId: data.uploadId, uploadUrl: data.uploadUrl, statusUrl: data.statusUrl }, 'CDP Uploader initiated')
  return data
}
