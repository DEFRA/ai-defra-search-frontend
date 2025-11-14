import Joi from 'joi'

const startPostSchema = Joi.object({
  question: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Question must be at least 1 character',
    'string.min': 'Question must be at least 1 character',
    'string.max': 'Question must be no more than 500 characters',
    'any.required': 'Question is required'
  })
})

export { startPostSchema }
