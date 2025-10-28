import { logoutController } from './controller.js'

/**
 * Sets up the routes used in the /logout page.
 * These routes are registered in src/server/router.js.
 */
export const logout = {
  plugin: {
    name: 'logout',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/logout',
          ...logoutController
        }
      ])
    }
  }
}
