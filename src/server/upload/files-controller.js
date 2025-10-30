import { CdpUploaderSyncClient } from '../cdp-uploader/cdp-uploader-sync-client.js'
import { FilesViewModel } from './view-model.js'

const filesGetController = {
  handler: async (request, h) => {
    try {
      const uploads = request.yar.get('uploads') || []
      
      if (uploads.length === 0) {
        const viewModel = FilesViewModel.createEmptyLibraryView()
        return h.view('upload/files', viewModel)
      }

      const client = new CdpUploaderSyncClient()
      const updatedUploads = []

      for (const upload of uploads) {
        try {
          if (upload.status === 'processing' || upload.status === 'pending') {
            const status = await client.checkStatus(`${upload.statusUrl}?debug=true`)
            upload.status = status.uploadStatus || 'unknown'
            upload.lastChecked = new Date().toISOString()
            
            if (status.files && status.files.length > 0) {
              upload.fileId = status.files[0].fileId
              upload.s3Key = status.files[0].s3Key
            }
          }
        } catch (error) {
          console.error(`Failed to check status for ${upload.filename}:`, error.message)
          upload.status = 'error'
          upload.error = error.message
        }
        
        updatedUploads.push(upload)
      }

      request.yar.set('uploads', updatedUploads)

      const showRefresh = updatedUploads.some(u => u.status === 'processing' || u.status === 'pending')
      const viewModel = new FilesViewModel({
        uploads: updatedUploads,
        showRefresh
      })

      return h.view('upload/files', viewModel)

    } catch (error) {
      console.error('Failed to load files:', error)
      const viewModel = FilesViewModel.createErrorView('Failed to load file status. Please try again.')
      return h.view('upload/files', viewModel)
    }
  }
}

const filesRefreshController = {
  handler: async (request, h) => {
    return h.redirect('/upload/files')
  }
}

export { filesGetController, filesRefreshController }