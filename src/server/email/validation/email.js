import Joi from 'joi'
import { email as emailErrorMessages } from './error-messages.js'

export const email = Joi.string().trim().email().required().messages({
  'any.required': emailErrorMessages.enterEmail,
  'string.base': emailErrorMessages.enterEmail,
  'string.email': emailErrorMessages.validEmail,
  'string.empty': emailErrorMessages.enterEmail
})
