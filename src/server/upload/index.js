import {
  uploadGetController,
  uploadPostController,
  uploadCreateGroupGetController,
  uploadCreateGroupPostController
} from './controller.js'

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
        },
        {
          method: 'GET',
          path: '/upload/create-group',
          ...uploadCreateGroupGetController
        },
        {
          method: 'POST',
          path: '/upload/create-group',
          ...uploadCreateGroupPostController
        }
      ])
    }
  }
}
