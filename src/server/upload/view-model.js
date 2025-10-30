class BaseViewModel {
  constructor() {
    this.pageTitle = 'AI DEFRA Search'
    this.serviceName = 'AI DEFRA Search'
    this.phaseTag = 'Beta'
    this.phaseTagText =
      'This is a new service - your feedback will help us to improve it.'
  }
}

class UploadViewModel extends BaseViewModel {
  constructor({ file, description, errorMessage } = {}) {
    super()
    this.pageTitle = 'Upload Document - AI DEFRA Search'
    this.heading = 'Upload Document'
    this.hintText = "Choose a file to upload. Supported formats: PDF, Word documents, text files (max 10MB)"
    
    // Preserve form data on validation errors
    this.file = file
    this.description = description
    this.errorMessage = errorMessage
  }

  static createValidationErrorView(payload, errorMessage) {
    return new UploadViewModel({
      ...payload,
      errorMessage: { text: errorMessage }
    })
  }

  static createFileTypeErrorView() {
    return new UploadViewModel({
      errorMessage: { 
        text: 'File type not supported. Please upload a PDF, Word document, or text file.' 
      }
    })
  }

  static createFileSizeErrorView() {
    return new UploadViewModel({
      errorMessage: { 
        text: 'File size must be less than 10MB' 
      }
    })
  }

  static createNoFileErrorView() {
    return new UploadViewModel({
      errorMessage: { 
        text: 'Please select a valid file to upload' 
      }
    })
  }

  static createUploadFailedErrorView() {
    return new UploadViewModel({
      errorMessage: { 
        text: 'Upload failed. Please try again.' 
      }
    })
  }
}

class FilesViewModel extends BaseViewModel {
  constructor({ uploads = [], message, errorMessage, showRefresh = false } = {}) {
    super()
    this.pageTitle = 'Document Library - AI DEFRA Search'
    this.heading = 'Document Library'
    this.uploads = this.processUploads(uploads)
    this.message = message
    this.errorMessage = errorMessage
    this.showRefresh = showRefresh
  }

  processUploads(uploads) {
    return uploads.map(upload => ({
      ...upload,
      formattedDate: this.formatUploadDate(upload.uploadedAt),
      statusClass: this.getStatusClass(upload.status),
      statusText: this.getStatusText(upload.status)
    }))
  }

  formatUploadDate(uploadedAt) {
    if (!uploadedAt) return 'Unknown'
    
    try {
      const date = new Date(uploadedAt)
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'Unknown'
    }
  }

  getStatusClass(status) {
    const statusClasses = {
      'completed': 'govuk-tag--green',
      'processing': 'govuk-tag--blue',
      'pending': 'govuk-tag--grey',
      'error': 'govuk-tag--red',
      'failed': 'govuk-tag--red',
      'unknown': 'govuk-tag--grey'
    }
    return statusClasses[status] || 'govuk-tag--grey'
  }

  getStatusText(status) {
    const statusTexts = {
      'completed': 'Completed',
      'processing': 'Processing',
      'pending': 'Pending',
      'error': 'Error',
      'failed': 'Failed',
      'unknown': 'Unknown'
    }
    return statusTexts[status] || 'Unknown'
  }

  static createEmptyLibraryView() {
    return new FilesViewModel({
      message: 'No files uploaded yet.',
      uploads: []
    })
  }

  static createErrorView(errorMessage) {
    return new FilesViewModel({
      errorMessage: { text: errorMessage },
      uploads: []
    })
  }
}

export { UploadViewModel, FilesViewModel }