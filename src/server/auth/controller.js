import { config } from '../../config/config.js'

const prototypePassword = config.get('prototypePassword')

/**
 * Authentication controller for the login page.
 * Handles GET and POST requests for authentication.
 */
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
