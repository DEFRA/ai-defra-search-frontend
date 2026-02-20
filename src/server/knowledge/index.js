import {
  knowledgeListController,
  knowledgeGroupController,
  knowledgeAddGroupGetController,
  knowledgeAddGroupPostController,
  knowledgeIngestController,
  knowledgeAddSourceController,
  knowledgeRemoveSourceController,
  knowledgeActivateSnapshotController,
  knowledgeQueryController
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
        { method: 'POST', path: '/knowledge/{groupId}/ingest', ...knowledgeIngestController },
        { method: 'POST', path: '/knowledge/{groupId}/sources/add', ...knowledgeAddSourceController },
        { method: 'POST', path: '/knowledge/{groupId}/sources/{sourceId}/remove', ...knowledgeRemoveSourceController },
        { method: 'POST', path: '/knowledge/{groupId}/snapshots/{snapshotId}/activate', ...knowledgeActivateSnapshotController },
        { method: 'POST', path: '/knowledge/{groupId}/query', ...knowledgeQueryController }
      ])
    }
  }
}
