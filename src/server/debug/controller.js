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
        const { urls } = request.payload || {}

        // Parse URLs - they could come as a string (one per line) or as an array
        let urlArray = []
        const errors = []

        if (!urls || urls.trim() === '') {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            error: 'Please enter at least one URL before submitting.',
            urls
          })
        }

        if (urls) {
          if (Array.isArray(urls)) {
            urlArray = urls.filter((url) => url && url.trim())
          } else if (typeof urls === 'string') {
            urlArray = urls
              .split('\n')
              .map((url) => url.trim())
              .filter((url) => url)
          }
        }

        // Validate URLs
        const urlRegex = /^https?:\/\/[^\s]+$/
        const validUrls = []

        for (let i = 0; i < urlArray.length; i++) {
          const url = urlArray[i]
          if (!urlRegex.test(url)) {
            errors.push(
              `Line ${i + 1}: "${url}" is not a valid URL. URLs must start with http:// or https://`
            )
          } else {
            validUrls.push(url)
          }
        }

        if (errors.length > 0) {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            error: `URL validation errors:\n${errors.join('\n')}`,
            urls
          })
        }

        const result = await debugService.setupVectorStore(validUrls)

        if (result.success) {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            results: result.data,
            urls
          })
        } else {
          return h.view('debug/index', {
            pageTitle: 'Vector Store Debug - AI DEFRA Search',
            heading: 'Vector Store Debug',
            serviceName: 'AI DEFRA Search',
            phaseTag: 'Beta',
            phaseTagText: 'Debug tool for testing vector store functionality.',
            error: result.error,
            urls
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
            'Sorry, there was a problem setting up the vector store. Please try again.',
          urls: request.payload?.urls || ''
        })
      }
    }
  }
}
