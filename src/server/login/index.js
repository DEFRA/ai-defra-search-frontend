import { loginGetController, loginPostController } from './controller.js'

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
                  path: '/',
                  handler: (_request, h) => {
                    return h.redirect('/login')
                  }
                },
        {
          method: 'GET',
          path: '/login',
          options: {
            auth: {
              mode: 'try'
            },
          },
          ...loginGetController
        },
        {
          method: 'POST',
          path: '/login',
          options: {
            auth: {
              mode: 'try'
            },
          },
          ...loginPostController
        }
      ])
    }
  }
}
