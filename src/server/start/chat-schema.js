import Joi from 'joi'

const minChatMessageLength = 1
const maxChatMessageLength = 500

const startPostSchema = Joi.object({
  modelId: Joi.string().required().messages({
    'any.required': 'Model ID is required'
  }),
  question: Joi.string()
    .min(minChatMessageLength)
    .max(maxChatMessageLength).required().messages({
      'string.empty': 'Question must be at least 1 character',
      'string.min': 'Question must be at least 1 character',
      'string.max': 'Question must be no more than 500 characters',
      'any.required': 'Question is required'
    })
})

export { startPostSchema }
