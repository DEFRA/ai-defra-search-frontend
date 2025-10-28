import Joi from 'joi'
import { email as emailValidation } from '../email/validation/email.js'
import { registerUser } from '../api-requests/users.js'

const registerGetController = {
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
    return h.view('register/index', {
      pageTitle: 'Register for AI Self Service',
      heading: 'Register for AI Self Service',
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Register' }]
    })
  }
}

const registerPostController = {
  options: {
    auth: {
      mode: 'try'
    },
    validate: {
      payload: Joi.object({
        emailaddress: emailValidation,
        firstname: Joi.string().required().messages({
          'string.empty': 'Enter your first name',
          'any.required': 'Enter your first name'
        }),
        lastname: Joi.string().required().messages({
          'string.empty': 'Enter your last name',
          'any.required': 'Enter your last name'
        }),
        project: Joi.string().required().messages({
          'string.empty': 'Enter your project name',
          'any.required': 'Enter your project name'
        })
      }),
      failAction: async (request, h, error) => {
        const errorMessages = {}
        error.details.forEach((detail) => {
          errorMessages[detail.path[0]] = { text: detail.message }
        })

        return h
          .view('register/index', {
            ...request.payload,
            pageTitle: 'Register for AI Self Service',
            heading: 'Register for AI Self Service',
            errorMessages,
            breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Register' }]
          })
          .code(400)
          .takeover()
      }
    }
  },
  handler: async (request, h) => {
    const { emailaddress, firstname, lastname, project } = request.payload

    try {
      const result = await registerUser({
        emailaddress,
        firstname,
        lastname,
        project
      })

      if (result.success) {
        return h.redirect('/register/success')
      } else {
        return h
          .view('register/index', {
            ...request.payload,
            pageTitle: 'Register for AI Self Service',
            heading: 'Register for AI Self Service',
            errorMessage: {
              text: result.error || 'Registration failed. Please try again.'
            },
            breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Register' }]
          })
          .code(400)
      }
    } catch (error) {
      return h
        .view('register/index', {
          ...request.payload,
          pageTitle: 'Register for AI Self Service',
          heading: 'Register for AI Self Service',
          errorMessage: { text: 'Registration failed. Please try again.' },
          breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Register' }]
        })
        .code(500)
    }
  }
}

const registerSuccessController = {
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
    return h.view('register/success', {
      pageTitle: 'Registration successful',
      heading: 'Registration successful',
      breadcrumbs: [
        { text: 'Home', href: '/' },
        { text: 'Register', href: '/register' },
        { text: 'Success' }
      ]
    })
  }
}

export {
  registerGetController,
  registerPostController,
  registerSuccessController
}
