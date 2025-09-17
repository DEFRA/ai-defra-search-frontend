import { debugController } from './controller.js'

export const debug = {
  plugin: {
    name: 'debug',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/debug',
          ...debugController.get
        },
        {
          method: 'POST',
          path: '/debug/vectorstore',
          ...debugController.postVectorStore
        },
        {
          method: 'POST',
          path: '/debug/setup',
          ...debugController.postSetup
        }
      ])
    }
  }
}
