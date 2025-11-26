import { authController } from './controller.js'

/**
 * Sets up the routes used for authentication.
 * These routes are registered in src/server/router.js.
 */
export const authRoutes = {
  plugin: {
    name: 'authRoutes',
    register (server) {
      server.route([
        {
          method: 'GET',
          path: '/auth/callback',
          options: {
            auth: {
              mode: 'try',
              strategy: 'azure'
            }
          },
          ...authController
        }
      ])
    }
  }
}
