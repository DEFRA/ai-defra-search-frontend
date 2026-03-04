// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('govuk-frontend', () => ({
  initAll: vi.fn(),
  createAll: vi.fn(),
  Button: class Button {},
  CharacterCount: class CharacterCount {},
  Checkboxes: class Checkboxes {},
  ErrorSummary: class ErrorSummary {},
  Header: class Header {},
  Radios: class Radios {},
  SkipLink: class SkipLink {}
}))

const MODULE_PATH = '../../../../src/client/javascripts/application.js'

describe('application.js', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('file picker', () => {
    const setupDOM = () => {
      document.body.innerHTML = `
        <input id="file-upload" type="file" class="govuk-visually-hidden">
        <button id="choose-files-btn" type="button">Select files</button>
        <ul id="selected-files"></ul>
      `
    }

    test('clicking the choose button triggers the hidden file input', async () => {
      setupDOM()
      const fileInput = document.getElementById('file-upload')
      const clickSpy = vi.spyOn(fileInput, 'click')

      await import(MODULE_PATH)

      document.getElementById('choose-files-btn').click()

      expect(clickSpy).toHaveBeenCalled()
    })

    test('selecting files updates the displayed file list', async () => {
      setupDOM()

      await import(MODULE_PATH)

      const fileInput = document.getElementById('file-upload')
      Object.defineProperty(fileInput, 'files', {
        value: [{ name: 'report.pdf' }, { name: 'data.csv' }],
        configurable: true
      })
      fileInput.dispatchEvent(new Event('change'))

      const list = document.getElementById('selected-files')
      expect(list.innerHTML).toContain('report.pdf')
      expect(list.innerHTML).toContain('data.csv')
    })
  })

  describe('file upload form', () => {
    const setupDOM = () => {
      document.body.innerHTML = `
        <form id="file-upload-form" method="post" action="http://localhost/upload-and-scan/abc123" enctype="multipart/form-data">
          <input type="file" name="file">
        </form>
      `
    }

    test('redirects to / when the upload response is an opaque redirect', async () => {
      setupDOM()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ type: 'opaqueredirect', status: 0, ok: false }))
      vi.stubGlobal('location', { href: '' })

      await import(MODULE_PATH)

      document.getElementById('file-upload-form').dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(window.location.href).toBe('/')
    })

    test('logs an error when the upload responds with a non-ok status', async () => {
      setupDOM()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ type: 'basic', status: 500, ok: false }))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await import(MODULE_PATH)

      document.getElementById('file-upload-form').dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(errorSpy).toHaveBeenCalledWith('Upload failed', 500)
    })

    test('logs an error when fetch throws a network error', async () => {
      setupDOM()
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await import(MODULE_PATH)

      document.getElementById('file-upload-form').dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(errorSpy).toHaveBeenCalledWith('Upload error', expect.any(Error))
    })
  })
})
