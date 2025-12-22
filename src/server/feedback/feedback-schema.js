import Joi from 'joi'

const maxCommentLength = 1200

const validRatings = [
  'very-useful',
  'useful',
  'neither',
  'not-useful',
  'not-at-all-useful'
]

const wasHelpfulRequiredMessage = 'Select how useful the AI Assistant was'

const feedbackPostSchema = Joi.object({
  conversationId: Joi.string().allow('').optional(),
  wasHelpful: Joi.string().valid(...validRatings).required().messages({
    'any.only': wasHelpfulRequiredMessage,
    'any.required': wasHelpfulRequiredMessage,
    'string.empty': wasHelpfulRequiredMessage
  }),
  comment: Joi.string().max(maxCommentLength).allow('').optional().messages({
    'string.max': `Comment must be ${maxCommentLength} characters or less`
  })
})

export { feedbackPostSchema }
