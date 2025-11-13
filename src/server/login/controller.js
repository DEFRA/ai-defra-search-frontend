import { config } from '../../config/config.js'

export const loginGetController = {
  handler (_request, h) {
    return h.view('login/login')
  }
}

export const loginPostController = {
  handler (request, h) {
    const { password } = request.payload

    if (password === config.get('prototypePassword')) {
      request.cookieAuth.set({ id: 'prototype-user' })

      return h.redirect('/start')
    }

    return h.view('login/login', {
      errorMessage: 'Enter the correct password'
    }).code(200)
  }
}
