import { startGetController, startPostController, clearConversationController, apiChatController, apiGetConversationController } from './controller.js'

/**
 * Sets up the routes used for authentication.
 * These routes are registered in src/server/router.js.
 */
export const start = {
  plugin: {
    name: 'start',
    register (server) {
      server.route([
        {
          method: 'GET',
          path: '/start/{conversationId?}',
          ...startGetController
        },
        {
          method: 'POST',
          path: '/start/{conversationId?}',
          ...startPostController
        },
        {
          method: ['GET'],
          path: '/start/clear/{conversationId?}',
          ...clearConversationController
        },
        {
          method: 'POST',
          path: '/api/chat',
          ...apiChatController
        },
        {
          method: 'GET',
          path: '/api/conversations/{conversationId}',
          ...apiGetConversationController
        }
      ])
    }
  }
}
