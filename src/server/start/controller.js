import statusCodes from 'http-status-codes'
import { startPostSchema, startParamsSchema } from './chat-schema.js'
import { createStartViewModel } from './start.model.js'
import {
  loadConversationPageData,
  detectPendingConflict,
  submitQuestion,
  loadSubmitError,
  loadValidationError,
  resetConversation
} from './chat-view-model.js'

const START_VIEW_PATH = 'start/start'

const startGetController = {
  async handler (request, h) {
    try {
      const data = await loadConversationPageData(request.params.conversationId)
      return h.view(START_VIEW_PATH, createStartViewModel(data)).code(data.notFound ? statusCodes.NOT_FOUND : statusCodes.OK)
    } catch (error) {
      request.logger.error({ err: error, conversationId: request.params.conversationId }, 'Error fetching conversation')
      return h.view('error/index', {
        pageTitle: 'Something went wrong',
        heading: 500,
        message: 'Sorry, there was a problem with the service request'
      }).code(statusCodes.INTERNAL_SERVER_ERROR)
    }
  }
}

const startPostController = {
  options: {
    validate: {
      payload: startPostSchema,
      params: startParamsSchema,
      failAction: async (request, h, error) => {
        const { conversationId } = request.params
        const { question, modelId } = request.payload || {}
        const errorMessage = error.details[0]?.message

        const data = await loadValidationError(conversationId, question, modelId, errorMessage)
        return h.view(START_VIEW_PATH, createStartViewModel(data)).code(statusCodes.BAD_REQUEST).takeover()
      }
    }
  },
  async handler (request, h) {
    const { modelId, question } = request.payload
    const { conversationId } = request.params

    if (conversationId) {
      const conflict = await detectPendingConflict(conversationId)
      if (conflict) {
        return h.view(START_VIEW_PATH, createStartViewModel({
          ...conflict,
          conversationId,
          responsePending: true,
          errorMessage: 'Please wait for the current response before sending another question.'
        })).code(statusCodes.CONFLICT)
      }
    }

    try {
      const { conversationId: id } = await submitQuestion(question, modelId, conversationId)
      return h.redirect(`/start/${id}`).code(statusCodes.SEE_OTHER)
    } catch (error) {
      request.logger.error({ err: error, question }, 'Error calling chat API')
      const data = await loadSubmitError(question, modelId, conversationId, error)
      return h.view(START_VIEW_PATH, createStartViewModel(data))
    }
  }
}

const clearConversationController = {
  async handler (request, h) {
    if (request.params.conversationId) {
      await resetConversation(request.params.conversationId)
    }
    return h.redirect('/start')
  }
}

export { startGetController, startPostController, clearConversationController }
