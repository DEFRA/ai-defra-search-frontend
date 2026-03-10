import { documentsGetController } from './controller.js'

export const documents = {
  plugin: {
    name: 'documents',
    register (server) {
      server.route([
        { method: 'GET', path: '/documents', ...documentsGetController }
      ])
    }
  }
}
