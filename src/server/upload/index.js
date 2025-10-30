import { uploadGetController, uploadPostController } from './controller.js'
import { filesGetController, filesRefreshController } from './files-controller.js'

export const upload = {
  plugin: {
    name: 'upload',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/upload',
          ...uploadGetController
        },
        {
          method: 'POST',
          path: '/upload',
          options: {
            ...uploadPostController.options
          },
          handler: uploadPostController.handler
        },
        {
          method: 'GET',
          path: '/upload/files',
          ...filesGetController
        },
        {
          method: 'POST',
          path: '/upload/files/refresh',
          ...filesRefreshController
        },
        {
          method: 'GET',
          path: '/upload/clear-session',
          handler: (request, h) => {
            request.yar.clear()
            return h.redirect('/upload/files')
          }
        }
      ])
    }
  }
}