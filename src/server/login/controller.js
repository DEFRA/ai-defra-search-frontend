import Joi from 'joi'
import { email as emailValidation } from '../email/validation/email.js'
import { sendMagicLink } from '../email/send-magic-link-email.js'
import { getByEmail } from '../api-requests/users.js'
import { clearSession } from '../session/index.js'

const hintText = "We'll use this to send you a link to use the AI Self Service"

const loginGetController = {
  options: {
    auth: {
      mode: 'try'
    },
    plugins: {
      'hapi-auth-cookie': {
        redirectTo: false
      }
    }
  },
  handler: (_request, h) => {
    return h.view('login/index', {
      pageTitle: 'Login',
      heading: 'Login',
      hintText
    })
  }
}

const loginPostController = {
  options: {
    auth: {
      mode: 'try'
    },
    validate: {
      payload: Joi.object({
        email: emailValidation
      }),
      failAction: async (request, h, error) => {
        return h
          .view('login/index', {
            ...request.payload,
            errorMessage: { text: error.details[0].message },
            hintText
          })
          .code(400)
          .takeover()
      }
    }
  },
  handler: async (_request, h) => {
    clearSession(_request)

    const { email } = _request.payload

    const userData = await getByEmail(email)

    if (!userData || !userData.email) {
      return h.redirect('/register')
    }

    await sendMagicLink(_request, email)

    return h.view('login/check-email', {
      activityText:
        'The email includes a link to use the AI Playground. This link will expire in 15 minutes.',
      email
    })
  }
}

export { loginGetController, loginPostController }
