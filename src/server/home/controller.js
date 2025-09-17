import { chatService } from '../api-requests/chat-service.js'
import { createLogger }  from '../common/helpers/logging/logger.js'

const logger = createLogger('homeController')

export const homeController = {
  get: {
    handler(_request, h) {
      return h.view('home/index', {
        pageTitle: 'Ask a Question - AI DEFRA Search',
        heading: 'Ask a Question',
        serviceName: 'AI DEFRA Search',
        phaseTag: 'Beta',
        phaseTagText: 'This is a new service – your feedback will help us to improve it.'
      })
    }
  },
  post: {
    handler: async (request, h) => {
      try {
        const { question } = request.payload

        if (!question || question.trim().length === 0) {
          return h.view('home/index', {
            pageTitle: 'Ask a Question - AI DEFRA Search',
            heading: 'Ask a Question',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'This is a new service – your feedback will help us to improve it.',
            error: 'Please enter a question before submitting.',
            question: question || ''
          })
        }

        const response = await chatService.sendQuestion(question.trim())

        if (!response.success) {
          return h.view('home/index', {
            pageTitle: 'Ask a Question - AI DEFRA Search',
            heading: 'Ask a Question',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'This is a new service – your feedback will help us to improve it.',
            error: 'Sorry, there was a problem processing your question. Please try again.',
            question: question || ''
          })
        }

        const formattedUsage = chatService.formatUsage(response.data.usage)
        const formattedSourceDocs = chatService.formatSourceDocuments(response.data.source_documents)

        logger.info('Raw API response usage:', JSON.stringify(response.data.usage, null, 2))
        logger.info('Raw source_documents:', JSON.stringify(response.data.source_documents, null, 2))
        logger.info('Formatted source documents:', JSON.stringify(formattedSourceDocs, null, 2))
        logger.info('Formatted usage for display:', JSON.stringify(formattedUsage, null, 2))

        return h.view('home/results', {
          pageTitle: 'Search Results - AI DEFRA Search',
          heading: 'Search Results',
          serviceName: 'AI DEFRA Search',
          phaseTag: 'Beta',
          phaseTagText: 'This is a new service – your feedback will help us to improve it.',
          question: response.data.question,
          answer: response.data.answer,
          sourceDocuments: formattedSourceDocs,
          usage: formattedUsage,
          sessionId: response.data.sessionId
        })
      } catch (error) {
        logger.error('Error processing question:', error)
        
        return h.view('home/index', {
          pageTitle: 'Ask a Question - AI DEFRA Search',
          heading: 'Ask a Question',
          serviceName: 'AI DEFRA Search',
          phaseTag: 'Beta',
          phaseTagText: 'This is a new service – your feedback will help us to improve it.',
          error: 'Sorry, there was an unexpected error. Please try again.',
          question: request.payload?.question || ''
        })
      }
    }
  }
}
