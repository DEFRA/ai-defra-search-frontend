import Joi from 'joi'
import { CdpUploaderSyncClient } from '../cdp-uploader/cdp-uploader-sync-client.js'
import { UploadViewModel } from './view-model.js'

const uploadGetController = {
  handler: (_request, h) => {
    const viewModel = new UploadViewModel()
    return h.view('upload/upload', viewModel)
  }
}

const uploadPostController = {
  options: {
    payload: {
      output: 'stream',
      parse: true,
      multipart: true,
      maxBytes: 10 * 1024 * 1024 // 10MB limit
    },
    validate: {
      payload: Joi.object({
        file: Joi.any().required().messages({
          'any.required': 'Please select a file to upload'
        }),
        description: Joi.string().optional().allow('')
      }),
      failAction: async (request, h, error) => {
        const viewModel = UploadViewModel.createValidationErrorView(
          request.payload,
          error.details[0].message
        )
        return h
          .view('upload/upload', viewModel)
          .code(400)
          .takeover()
      }
    }
  },
  handler: async (request, h) => {
    try {
      const client = new CdpUploaderSyncClient()
      const { file, ...formFields } = request.payload
      
      if (!file || !file.hapi || !file.hapi.filename) {
        const viewModel = UploadViewModel.createNoFileErrorView()
        return h.view('upload/upload', viewModel).code(400)
      }

      if (file.hapi.headers['content-length'] > 10 * 1024 * 1024) {
        const viewModel = UploadViewModel.createFileSizeErrorView()
        return h.view('upload/upload', viewModel).code(400)
      }

      const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
      const fileExtension = file.hapi.filename.toLowerCase().substring(file.hapi.filename.lastIndexOf('.'))
      
      if (!allowedTypes.includes(fileExtension)) {
        const viewModel = UploadViewModel.createFileTypeErrorView()
        return h.view('upload/upload', viewModel).code(400)
      }

      const { uploadUrl, statusUrl } = await client.initiate()
      
      await client.uploadFile(uploadUrl, file, formFields)
      
      console.log('File uploaded successfully, processing...', {
        filename: file.hapi.filename,
        statusUrl
      })
      
      if (!request.yar.get('uploads')) {
        request.yar.set('uploads', [])
      }
      
      const uploads = request.yar.get('uploads')
      uploads.push({
        id: Date.now().toString(),
        filename: file.hapi.filename,
        statusUrl,
        uploadedAt: new Date().toISOString(),
        status: 'processing'
      })
      request.yar.set('uploads', uploads)
      
      return h.redirect('/upload/files')
      
    } catch (error) {
      console.error('Upload failed:', error)
      const viewModel = UploadViewModel.createUploadFailedErrorView()
      return h.view('upload/upload', viewModel).code(500)
    }
  }
}

export { uploadGetController, uploadPostController }