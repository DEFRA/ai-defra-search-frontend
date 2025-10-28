import { loginGetController, loginPostController } from './controller.js'

export const login = {
  plugin: {
    name: 'login',
    register(server) {
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
