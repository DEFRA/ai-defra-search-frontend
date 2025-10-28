import {
  registerGetController,
  registerPostController,
  registerSuccessController
} from './controller.js'

export const register = {
  plugin: {
    name: 'register',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/register',
          ...registerGetController
        },
        {
          method: 'POST',
          path: '/register',
          ...registerPostController
        },
        {
          method: 'GET',
          path: '/register/success',
          ...registerSuccessController
        }
      ])
    }
  }
}
