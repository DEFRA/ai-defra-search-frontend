import fetch from 'node-fetch'

import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export async function initiateUpload ({ knowledgeGroupId }) {
  const cdpUploaderUrl = config.get('cdpUploaderUrl')
  const uploadBucketUrl = config.get('uploadBucketUrl')

  if (!cdpUploaderUrl) {
    throw new Error('CDP Uploader URL not configured')
  }
  if (!uploadBucketUrl) {
    throw new Error('Upload bucket URL not configured')
  }

  const url = `${cdpUploaderUrl}/initiate`
  const body = {
    redirect: '/',
    s3Bucket: uploadBucketUrl,
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

  logger.info({ status: response.status }, 'CDP Uploader initiate response')

  if (!response.ok) {
    const err = new Error(`CDP Uploader initiate failed with status ${response.status}`)
    logger.warn({ err }, 'CDP Uploader initiate failed')
    throw err
  }

  return response.json()
}
