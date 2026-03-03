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
const chooseBtn = document.getElementById('choose-files-btn')
const selectedFiles = document.getElementById('selected-files')

if (fileUpload && chooseBtn && selectedFiles) {
  chooseBtn.addEventListener('click', function () { fileUpload.click() })
  fileUpload.addEventListener('change', function () {
    selectedFiles.innerHTML = Array.from(this.files)
      .map(function (f) { return '<li>' + f.name + '</li>' })
      .join('')
  })
}

const fileUploadForm = document.getElementById('file-upload-form')
if (fileUploadForm) {
  fileUploadForm.addEventListener('submit', async function (event) {
    event.preventDefault()
    const response = await fetch(fileUploadForm.action, {
      method: 'POST',
      body: new FormData(fileUploadForm),
      redirect: 'manual'
    })
    if (response.type === 'opaqueredirect' || response.status === 0) {
      window.location.href = '/'
    }
  })
}
