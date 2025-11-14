import { sendQuestion } from '../common/helpers/chat-api.js'
import { startPostSchema } from '../../schema/chatSchema.js'

export const startGetController = {
  handler (_request, h) {
    return h.view('start/start')
  }
}

export const startPostController = {
  options: {
    validate: {
      payload: startPostSchema,
      failAction: (request, h, error) => {
        const errorMessage = error.details[0]?.message

        return h.view('start/start', {
          question: request.payload?.question,
          errorMessage
        }).code(400).takeover()
      }
    }
  },
  async handler (request, h) {
    const { question } = request.payload

    try {
      // Call the chat API with the user's question
      const response = await sendQuestion(question)

      // Re-render the page with the response (textarea cleared)
      return h.view('start/start', {
        messages: response.messages,
        conversationId: response.conversationId
      })
    } catch (error) {
      // Log the error
      request.logger.error({ error, question }, 'Error calling chat API')

      // Re-render the page with the question and error message
      return h.view('start/start', {
        question,
        errorMessage: 'Sorry, there was a problem getting a response. Please try again.'
      })
    }
  }
}
