import Joi from 'joi'

const maxCommentLength = 1200

const validRatings = [
  'very-useful',
  'useful',
  'neither',
  'not-useful',
  'not-at-all-useful'
]

const feedbackPostSchema = Joi.object({
  conversationId: Joi.string().allow('').optional(),
  wasHelpful: Joi.string().valid(...validRatings).required().messages({
    'any.only': 'Select how useful the AI Assistant was',
    'any.required': 'Select how useful the AI Assistant was',
    'string.empty': 'Select how useful the AI Assistant was'
  }),
  comment: Joi.string().max(maxCommentLength).allow('').optional().messages({
    'string.max': `Comment must be ${maxCommentLength} characters or less`
  })
})

export { feedbackPostSchema }
