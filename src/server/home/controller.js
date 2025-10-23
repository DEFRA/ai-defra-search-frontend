import { chatService } from '../api-requests/chat-service.js'
import { conversationHistoryService } from '../api-requests/conversation-history-service.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger('homeController')

export const homeController = {
  get: {
    handler(request, h) {
      const { question } = request.query

      return h.view('home/index', {
        pageTitle: 'Ask a Question - AI DEFRA Search',
        heading: 'Ask a Question',
        serviceName: 'AI DEFRA Search',
        phaseTag: 'Beta',
        phaseTagText:
          'This is a new service – your feedback will help us to improve it.',
        question
      })
    }
  },
  post: {
    handler: async (request, h) => {
      try {
        logger.info('Received question submission')

        const { question, conversationId } = request.payload

        if (!question || question.trim().length === 0) {
          return h.view('home/index', {
            pageTitle: 'Ask a Question - AI DEFRA Search',
            heading: 'Ask a Question',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText:
              'This is a new service – your feedback will help us to improve it.',
            error: 'Please enter a question before submitting.',
            question: question || '',
            conversationId: conversationId || null,
            conversationHistory: []
          })
        }

        const response = await chatService.sendQuestion(
          question.trim(),
          conversationId
        )

        if (!response.success) {
          return h.view('home/index', {
            pageTitle: 'Ask a Question - AI DEFRA Search',
            heading: 'Ask a Question',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText:
              'This is a new service - your feedback will help us to improve it.',
            error: response.data.answer,
            question: question || '',
            conversationId: response.data?.conversationId || null,
            conversationHistory: []
          })
        }

        return h.redirect(`/chat/${response.data.conversationId}`)
      } catch (error) {
        logger.error('Error processing question:', error)

        return h.view('home/index', {
          pageTitle: 'Ask a Question - AI DEFRA Search',
          heading: 'Ask a Question',
          serviceName: 'AI DEFRA Search',
          phaseTag: 'Beta',
          phaseTagText:
            'This is a new service - your feedback will help us to improve it.',
          error: 'Sorry, there was an unexpected error. Please try again.',
          question: request.payload?.question || '',
          conversationId: request.payload?.conversationId || null,
          conversationHistory: [],
          transcriptUrl: request.payload?.conversationId
            ? '/transcript/' + (request.payload?.conversationId || '')
            : ''
        })
      }
    }
  },
  getTranscript: {
    handler: async (request, h) => {
      const { conversationId } = request.params
      let conversationHistory = null
      try {
        conversationHistory =
          await conversationHistoryService.getConversationHistory(
            conversationId
          )
      } catch (err) {
        conversationHistory = null
      }

      if (
        !conversationHistory ||
        !Array.isArray(conversationHistory.messages) ||
        conversationHistory.messages.length === 0
      ) {
        return h
          .response('No transcript found for this conversation.')
          .code(404)
      }

      const transcript =
        conversationHistoryService.constructor.formatTranscript(
          conversationHistory
        )
      return h
        .response(transcript)
        .type('text/plain')
        .header(
          'Content-Disposition',
          `attachment; filename="transcript-${conversationId}.txt"`
        )
    }
  }
}
