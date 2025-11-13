import { config } from '../../config/config.js'

export const loginGetController = {
  handler (_request, h) {
    return h.view('login/login')
  }
}

export const loginPostController = {
  handler (request, h) {
    return h.view('login/login', {
      errorMessage: 'Enter the correct password'
    }).code(200)
  }
}
