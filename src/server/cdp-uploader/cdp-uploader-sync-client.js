import FormData from 'form-data' // multipart formdata
import fetch from 'node-fetch'

export class CdpUploaderSyncClient {
  constructor (config = {}) {
    this.baseUrl = new URL(config.baseUrl || 'http://host.docker.internal:7337')
    this.s3Bucket = config.s3Bucket || 'ai-defra-search-uploads'
    this.redirectUrl = config.redirectUrl || 'http://host.docker.internal:3000'
  }

  async initiate () {
    const response = await fetch(new URL('initiate', this.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        redirect: this.redirectUrl,
        s3Bucket: this.s3Bucket
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Failed to initiate upload: ${text}`)
    }

    const result = await response.json()
    const { pathname: uploadPath } = new URL(result.uploadUrl)
    const { pathname: statusPath } = new URL(result.statusUrl)

    return {
      ...result,
      uploadUrl: new URL(uploadPath, this.baseUrl).toString(),
      statusUrl: new URL(statusPath, this.baseUrl).toString()
    }
  }

  async uploadFile (uploadUrl, files, formFields = {}) {
    const form = new FormData()

    Object.entries(formFields).forEach(([key, value]) => {
      form.append(key, value)
    })

    if (Array.isArray(files)) {
      console.log('Processing array of files')
      files.forEach((file, index) => {
        // Handle Hapi file objects properly
        if (file && file.hapi && file.hapi.filename) {
          form.append(`file${index + 1}`, file._data, {
            filename: file.hapi.filename,
            contentType: file.hapi.headers['content-type']
          })
        } else {
          form.append(`file${index + 1}`, file)
        }
      })
    } else {
      console.log('Processing single file:', {
        type: typeof files,
        isBuffer: Buffer.isBuffer(files),
        hasStream: files.pipe !== undefined,
        hasHapi: files && files.hapi !== undefined,
        filename: files && files.hapi ? files.hapi.filename : 'unknown',
        keys: Object.keys(files)
      })
      
      // Handle Hapi file objects properly
      if (files && files.hapi && files.hapi.filename) {
        console.log('Uploading Hapi file:', files.hapi.filename)
        form.append('file', files._data, {
          filename: files.hapi.filename,
          contentType: files.hapi.headers['content-type']
        })
      } else {
        form.append('file', files)
      }
    }

    console.log('Uploading to URL:', uploadUrl)
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    })

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text()
      throw new Error(`Upload failed with status ${uploadResponse.status}: ${text}`)
    }

    return true
  }

  async checkStatus (statusUrl) {
    const response = await fetch(statusUrl)
    return await response.json()
  }

  async waitForCompletion (statusUrl, maxAttempts = 30, interval = 1000) {
    let attempts = 0

    while (attempts < maxAttempts) {
      const status = await this.checkStatus(`${statusUrl}?debug=true`)

      if (status.uploadStatus === 'ready' || status.uploadStatus === 'rejected') {
        return status
      }

      await new Promise(resolve => setTimeout(resolve, interval))
      attempts++
    }

    throw new Error('Upload processing timed out')
  }

  async uploadSync (files, formFields = {}) {
    try {
      const { uploadUrl, statusUrl } = await this.initiate()

      await this.uploadFile(uploadUrl, files, formFields)
      console.log('Files uploaded, waiting for processing...')

      const result = await this.waitForCompletion(statusUrl)
      console.log('Processing complete:', JSON.stringify(result, null, 2))

      return result
    } catch (error) {
      console.error('Upload sync failed:', error.message)
      throw error
    }
  }
}