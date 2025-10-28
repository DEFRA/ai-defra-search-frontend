import { config } from '../../config/config.js'
import { clearSession } from '../session/index.js'

export const logoutController = {
  options: {
    auth: {
      mode: 'optional'
    }
  },
  handler(_request, h) {
    const cookieConfig = config.get('session').cookie
    h.unstate(cookieConfig.cookieNameAuth)

    if (_request.state && _request.state[cookieConfig.cookieNameAuth]) {
      _request.server.app.sessionCache?.drop(
        _request.state[cookieConfig.cookieNameAuth]
      )
    }

    if (_request.yar) {
      clearSession(_request)
    }

    if (_request.cookieAuth) {
      _request.cookieAuth.clear()
    }

    return h.redirect('/login').message('You have been logged out')
  }
}
