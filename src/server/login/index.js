import { loginGetController, loginPostController } from './controller.js'

/**
 * Sets up the routes used for authentication.
 * These routes are registered in src/server/router.js.
 */
export const login = {
  plugin: {
    name: 'auth',
    register (server) {
      server.route([
        {
          method: 'GET',
          path: '/login',
          ...loginGetController
        },
        {
          method: 'POST',
          path: '/login',
          ...loginPostController
        }
      ])
    }
  }
}
