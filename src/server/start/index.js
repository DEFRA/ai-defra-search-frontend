import { startGetController, startPostController, clearConversationController } from './controller.js'

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
          path: '/start',
          ...startGetController
        },
        {
          method: 'POST',
          path: '/start/{conversationId?}',
          ...startPostController,
          options: {
            ...startPostController.options,
            timeout: {
              socket: 3 * 60 * 1000 // 3 minutes to allow for SSE processing
            }
          }
        },
        {
          method: ['GET'],
          path: '/start/clear/{conversationId?}',
          ...clearConversationController
        }
      ])
    }
  }
}
