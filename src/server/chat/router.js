import * as chatController from '../chat/controller.js'

export const chat = {
  plugin: {
    name: 'chat',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/chat/{conversationId}',
          async handler(request, h) {
            const { conversationId } = request.params

            return await chatController.getConversation(conversationId, h)
          }
        }
      ])
    }
  }
}
