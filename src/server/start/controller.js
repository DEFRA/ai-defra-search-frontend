import { sendQuestion } from '../common/helpers/chat-api.js'

export const startGetController = {
  handler (_request, h) {
    return h.view('start/start')
  }
}

export const startPostController = {
  async handler (request, h) {
    const { question } = request.payload

    try {
      // Call the chat API with the user's question
      const response = await sendQuestion(question)

      // Re-render the page with the response (textarea cleared)
      return h.view('start/start', {
        messages: response.messages,
        conversationId: response.conversation_id
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
