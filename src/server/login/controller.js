import { config } from '../../config/config.js'

export const loginGetController = {
  handler (_request, h) {
    return h.view('auth/login')
  }
}

export const loginPostController = {
  handler (request, h) {
    return h.view('auth/login', {
      errorMessage: 'Enter the correct password'
    }).code(200)
  }
}
