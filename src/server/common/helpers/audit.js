import { audit } from '@defra/cdp-auditing'

function emitAuditEvent ({ eventType, userId = null, sessionId, ...eventData }) {
  audit({
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    eventType,
    ...eventData
  })
}

function auditLlmInteraction ({ userId, sessionId, conversationId, messages }) {
  const failedMessage = messages.find(msg => msg.role === 'assistant' && msg.status === 'failed')
  const completedMessage = messages.find(msg => msg.role === 'assistant' && msg.status === 'completed')
  const assistantMessage = failedMessage || completedMessage

  if (!assistantMessage) {
    return
  }

  const interactionStatus = assistantMessage.status === 'failed' ? 'failure' : 'success'

  emitAuditEvent({
    eventType: 'llm_interaction',
    userId,
    sessionId,
    conversationId,
    modelId: assistantMessage.model_id ?? null,
    interactionStatus
  })
}

function auditLoginSuccess ({ userId, sessionId, sourceIp }) {
  emitAuditEvent({
    eventType: 'login_success',
    userId,
    sessionId,
    sourceIp
  })
}

function auditKnowledgeGroupFileUpload ({ userId, sessionId, knowledgeGroupId, fileName, fileSize, uploadStatus }) {
  emitAuditEvent({
    eventType: 'knowledge_group_file_upload',
    userId,
    sessionId,
    knowledgeGroupId,
    fileName,
    fileSize,
    uploadStatus
  })
}

export {
  emitAuditEvent,
  auditLlmInteraction,
  auditLoginSuccess,
  auditKnowledgeGroupFileUpload
}
