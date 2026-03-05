import {
  uploadGetController,
  uploadPostController,
  uploadFileGetController,
  uploadStatusGetController,
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
          path: '/upload/files/{uploadReference}',
          ...uploadFileGetController
        },
        {
          method: 'GET',
          path: '/upload-status/{uploadReference}',
          ...uploadStatusGetController
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
