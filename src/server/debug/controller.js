import { createLogger } from '../common/helpers/logging/logger.js'
import { debugService } from '../api-requests/debug-service.js'

const logger = createLogger('debugController')

export const debugController = {
  get: {
    handler(_request, h) {
      return h.view('debug/index', {
        pageTitle: 'Vector Store Debug - AI DEFRA Search',
        heading: 'Vector Store Debug',
        serviceName: 'AI DEFRA Search',
        phaseTag: 'Beta',
        phaseTagText: 'Debug tool for testing vector store functionality.'
      })
    }
  },

  postVectorStore: {
    handler: async (request, h) => {
      try {
        const { question } = request.payload

        if (!question || question.trim().length === 0) {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            error: 'Please enter a question before submitting.'
          })
        }

        const result = await debugService.searchVectorStore(question)

        if (result.success) {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            results: result.data,
            question
          })
        } else {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            error: result.error,
            question
          })
        }
      } catch (error) {
        logger.error('Error in postVectorStore handler:', error)
        return h.view('debug/index', {
          pageTitle: 'Vector Store Debug - AI DEFRA Search',
          heading: 'Vector Store Debug',
          serviceName: 'AI DEFRA Search',
          phaseTag: 'Beta',
          phaseTagText: 'Debug tool for testing vector store functionality.',
          error:
            'Sorry, there was a problem processing your request. Please try again.',
          question: request.payload.question || ''
        })
      }
    }
  },

  postSetup: {
    handler: async (request, h) => {
      try {
        const result = await debugService.setupVectorStore()

        if (result.success) {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            results: result.data
          })
        } else {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            error: result.error
          })
        }
      } catch (error) {
        logger.error('Error in postSetup handler:', error)
        return h.view('debug/index', {
          pageTitle: 'Vector Store Debug - AI DEFRA Search',
          heading: 'Vector Store Debug',
          serviceName: 'AI DEFRA Search',
          phaseTag: 'Beta',
          phaseTagText: 'Debug tool for testing vector store functionality.',
          error:
            'Sorry, there was a problem setting up the vector store. Please try again.'
        })
      }
    }
  }
}
