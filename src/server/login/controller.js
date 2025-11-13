import { randomUUID as uuidv4 } from 'crypto'

import { config } from '../../config/config.js'

export const loginGetController = {
  handler (_request, h) {
    return h.view('login/login')
  }
}

export const loginPostController = {
  async handler (request, h) {
    const { password } = request.payload

    if (password === config.get('prototypePassword')) {
      const sessionId = uuidv4()

      await request.server.app.cache.set(sessionId, {
        isAuthenticated: true
      })

      request.cookieAuth.set({ id: sessionId })

      return h.redirect('/start')
    }

    return h.view('login/login', {
      errorMessage: 'Enter the correct password'
    }).code(200)
  }
}
