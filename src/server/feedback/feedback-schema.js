import Joi from 'joi'

const MAX_COMMENT_LENGTH = 1200

const VALID_RATINGS = [
  'very-useful',
  'useful',
  'neither',
  'not-useful',
  'not-at-all-useful'
]

const WAS_HELPFUL_REQUIRED_MESSAGE = 'Select how useful the AI Assistant was'

const FEEDBACK_POST_SCHEMA = Joi.object({
  conversationId: Joi.string().allow('').optional(),
  wasHelpful: Joi.string().valid(...VALID_RATINGS).required().messages({
    'any.only': WAS_HELPFUL_REQUIRED_MESSAGE,
    'any.required': WAS_HELPFUL_REQUIRED_MESSAGE,
    'string.empty': WAS_HELPFUL_REQUIRED_MESSAGE
  }),
  comment: Joi.string().max(MAX_COMMENT_LENGTH).allow('').optional().messages({
    'string.max': `Comment must be ${MAX_COMMENT_LENGTH} characters or less`
  })
})

export { FEEDBACK_POST_SCHEMA }
