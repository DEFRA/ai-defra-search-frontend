import { feedbackGetController, feedbackPostController, feedbackSuccessController } from './controller.js'

/**
 * Sets up the routes for feedback functionality.
 * These routes are registered in src/server/router.js.
 */
export const feedback = {
  plugin: {
    name: 'feedback',
    register (server) {
      server.route([
        {
          method: 'GET',
          path: '/feedback',
          ...feedbackGetController
        },
        {
          method: 'POST',
          path: '/feedback',
          ...feedbackPostController
        },
        {
          method: 'GET',
          path: '/feedback/success',
          ...feedbackSuccessController
        }
      ])
    }
  }
}
