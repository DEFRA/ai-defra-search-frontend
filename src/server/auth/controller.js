import { config } from '../../config/config.js'

const PROTOTYPE_PASSWORD = config.get('prototypePassword')

/**
 * Authentication controller for the login page.
 * Handles GET and POST requests for authentication.
 */
export const loginGetController = {
  handler (_request, h) {
    return h.view('auth/login', {
      pageTitle: 'Login'
    })
  }
}

export const loginPostController = {
  handler (request, h) {
    const { password } = request.payload

    if (password === PROTOTYPE_PASSWORD) {
      // Set authenticated session
      request.yar.set('authenticated', true)
      
      // Redirect to the start page
      return h.redirect('/start').code(308)
    }

    // Return login page with error
    return h.view('auth/login', {
      pageTitle: 'Login Failed',
      errorMessage: 'Incorrect password. Please try again.'
    }).code(200)
  }
}
