import Joi from 'joi'

const MIN_CHAT_MESSAGE_LENGTH = 1
const MAX_CHAT_MESSAGE_LENGTH = 500

const START_POST_SCHEMA = Joi.object({
  modelId: Joi.string().required().messages({
    'any.required': 'Model ID is required',
    'string.empty': 'Please select a model'
  }),
  question: Joi.string()
    .min(MIN_CHAT_MESSAGE_LENGTH)
    .max(MAX_CHAT_MESSAGE_LENGTH).required().messages({
      'string.empty': 'Question must be at least 1 character',
      'string.min': 'Question must be at least 1 character',
      'string.max': 'Question must be no more than 500 characters',
      'any.required': 'Question is required'
    })
})

const START_PARAMS_SCHEMA = Joi.object({
  conversationId: Joi.string().optional()
})

export { START_POST_SCHEMA, START_PARAMS_SCHEMA }
