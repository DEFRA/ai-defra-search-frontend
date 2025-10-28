import Joi from 'joi'
import { lookupToken, setAuthCookie } from '../auth/index.js'

const isRequestInvalid = (cachedEmail, email) => {
  return !cachedEmail || email !== cachedEmail
}

export const verifyLoginController = {
  options: {
    auth: false,
    validate: {
      query: Joi.object({
        email: Joi.string().email(),
        token: Joi.string().uuid().required()
      }),
      failAction: async (request, h, error) => {
        console.error(error)
        return h.view('verify-login/verify-login-failed').code(400).takeover()
      }
    }
  },
  handler: async (_request, h) => {
    const { email, token } = _request.query

    const {
      email: cachedEmail,
      redirectTo,
      userType
    } = await lookupToken(_request, token)
    if (isRequestInvalid(cachedEmail, email)) {
      return h.view('verify-login/verify-login-failed').code(400)
    }

    setAuthCookie(_request, email, userType)

    return h.redirect(redirectTo)
  }
}
