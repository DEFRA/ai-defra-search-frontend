import {
  knowledgeListController,
  knowledgeGroupController,
  knowledgeGroupDocumentsController,
  knowledgeAddGroupGetController,
  knowledgeAddGroupPostController
} from './controller.js'

export const knowledge = {
  plugin: {
    name: 'knowledge',
    register (server) {
      server.route([
        { method: 'GET', path: '/knowledge', ...knowledgeListController },
        { method: 'GET', path: '/knowledge/add', ...knowledgeAddGroupGetController },
        { method: 'POST', path: '/knowledge/add', ...knowledgeAddGroupPostController },
        { method: 'GET', path: '/knowledge/{groupId}', ...knowledgeGroupController },
        { method: 'GET', path: '/knowledge/{groupId}/documents', ...knowledgeGroupDocumentsController }
      ])
    }
  }
}
