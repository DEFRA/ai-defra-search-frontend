import {
  uploadGetController,
  uploadPostController,
  uploadFileGetController,
  uploadCallbackController,
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
          path: '/upload/files/{uploadId}',
          ...uploadFileGetController
        },
        {
          method: 'POST',
          path: '/upload/callback/{uploadReference}',
          ...uploadCallbackController
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
        },
      ])
    }
  }
}
