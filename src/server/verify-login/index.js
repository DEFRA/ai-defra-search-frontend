import { verifyLoginController } from './controller.js'

export const verifyLogin = {
  plugin: {
    name: 'verifyLogin',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/verify-login',
          ...verifyLoginController
        }
      ])
    }
  }
}
