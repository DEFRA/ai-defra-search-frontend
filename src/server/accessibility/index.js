import { accessibilityGetController } from './controller.js'

export const accessibility = {
  plugin: {
    name: 'accessibility',
    register (server) {
      server.route([
        {
          method: 'GET',
          path: '/accessibility',
          ...accessibilityGetController
        }
      ])
    }
  }
}
