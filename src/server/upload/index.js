import { uploadGetController, uploadPostController } from './controller.js'

export const upload = {
  plugin: {
    name: 'upload',
    register (server) {
      server.route([
        {
          method: 'GET',
          path: '/upload',
          ...uploadGetController
        },
        {
          method: 'POST',
          path: '/upload',
          ...uploadPostController
        }
      ])
    }
  }
}
