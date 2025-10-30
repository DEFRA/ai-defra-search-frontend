import * as uploadController from '../upload/controller.js'

export const upload = {
  plugin: {
    name: 'upload',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/upload',
          async handler(request, h) {
            return await uploadController.uploadFile(request, h)
          },
          options: {
            payload: {
                output: 'stream',
                parse: true,
                multipart: true,
                maxBytes: 100 * 1024 * 1024 // 100MB limit
            }
         }
        }
      ])
    }
  }
}