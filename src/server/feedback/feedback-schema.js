import Joi from 'joi'

const maxCommentLength = 1000

const feedbackPostSchema = Joi.object({
  conversationId: Joi.string().allow('').optional(),
  wasHelpful: Joi.string().valid('yes', 'no').allow('').optional().messages({
    'any.only': 'Please select yes or no'
  }),
  comment: Joi.string().max(maxCommentLength).allow('').optional().messages({
    'string.max': `Comment must be no more than ${maxCommentLength} characters`
  })
})

export { feedbackPostSchema }
