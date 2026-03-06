import {
  initAll,
  createAll,
  Button,
  CharacterCount,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(CharacterCount)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

initAll()

const fileUpload = document.getElementById('file-upload')
const selectedFilesSection = document.getElementById('selected-files-section')
const selectedFiles = document.getElementById('selected-files')

if (fileUpload && selectedFilesSection && selectedFiles) {
  fileUpload.addEventListener('change', function () {
    selectedFiles.innerHTML = Array.from(this.files)
      .map(function (f) { return '<li>' + f.name + '</li>' })
      .join('')
    selectedFilesSection.removeAttribute('hidden')
  })
}

const fileUploadForm = document.getElementById('file-upload-form')
if (fileUploadForm) {
  fileUploadForm.addEventListener('submit', async function (event) {
    event.preventDefault()
    try {
      const res = await fetch(fileUploadForm.action, {
        method: 'POST',
        body: new FormData(fileUploadForm),
        redirect: 'manual'
      })
      const HTTP_FOUND = 302
      const redirected = res.type === 'opaqueredirect' || res.status === HTTP_FOUND
      if (redirected) {
        window.location.href = fileUploadForm.dataset.successRedirect || '/'
      }
      if (!redirected && !res.ok) {
        console.error('Upload failed', res.status)
      }
    } catch (err) {
      console.error('Upload error', err)
    }
  })
}
