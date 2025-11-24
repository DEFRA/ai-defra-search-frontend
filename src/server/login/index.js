import { loginGetController } from './controller.js'

/**
 * Sets up the routes used for authentication.
 * These routes are registered in src/server/router.js.
 */
export const login = {
  plugin: {
    name: 'login',
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
          ...loginGetController
        }
      ])
    }
  }
}
