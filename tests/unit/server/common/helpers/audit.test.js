import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@defra/cdp-auditing', () => ({
  audit: vi.fn()
}))

const { audit } = await import('@defra/cdp-auditing')
const {
  emitAuditEvent,
  auditLlmInteraction,
  auditLoginSuccess,
  auditKnowledgeGroupFileUpload
} = await import('../../../../../src/server/common/helpers/audit.js')

describe('audit helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('emitAuditEvent sends a timestamped payload to cdp audit', () => {
    emitAuditEvent({
      eventType: 'custom_event',
      userId: 'user-1',
      sessionId: 'session-1',
      detail: 'value'
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'custom_event',
      userId: 'user-1',
      sessionId: 'session-1',
      detail: 'value'
    }))
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    }))
  })

  test('auditLlmInteraction maps llm interaction fields', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      interactionStatus: 'success'
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'llm_interaction',
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      interactionStatus: 'success'
    }))
  })

  test('auditLlmInteraction determines success status from completed assistant messages', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      messages: [
        { role: 'user', content: 'Hello', status: 'completed' },
        { role: 'assistant', content: 'Hi', status: 'completed' }
      ]
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'llm_interaction',
      interactionStatus: 'success'
    }))
  })

  test('auditLlmInteraction determines failure status from failed assistant messages', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      messages: [
        { role: 'user', content: 'Hello', status: 'completed' },
        { role: 'assistant', content: 'Error', status: 'failed' }
      ]
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'llm_interaction',
      interactionStatus: 'failure'
    }))
  })

  test('auditLlmInteraction prioritizes failure status when both completed and failed messages exist', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      messages: [
        { role: 'assistant', content: 'First', status: 'completed' },
        { role: 'assistant', content: 'Second', status: 'failed' }
      ]
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'llm_interaction',
      interactionStatus: 'failure'
    }))
  })

  test('auditLlmInteraction does not emit audit when no completed or failed assistant messages', () => {
    vi.clearAllMocks()

    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      messages: [
        { role: 'user', content: 'Hello', status: 'completed' }
      ]
    })

    expect(audit).not.toHaveBeenCalled()
  })

  test('auditLlmInteraction does not emit audit when assistant message is pending', () => {
    vi.clearAllMocks()

    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      modelId: 'model-1',
      messages: [
        { role: 'assistant', content: 'Thinking...', status: 'pending' }
      ]
    })

    expect(audit).not.toHaveBeenCalled()
  })

  test('auditLoginSuccess maps login fields', () => {
    auditLoginSuccess({
      userId: 'user-1',
      sessionId: 'session-1',
      sourceIp: '127.0.0.1'
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'login_success',
      userId: 'user-1',
      sessionId: 'session-1',
      sourceIp: '127.0.0.1'
    }))
  })

  test('auditKnowledgeGroupFileUpload maps file upload fields', () => {
    auditKnowledgeGroupFileUpload({
      userId: 'user-1',
      sessionId: 'session-1',
      knowledgeGroupId: 'kg-1',
      fileName: 'report.pdf',
      fileSize: 1200,
      uploadStatus: 'complete'
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'knowledge_group_file_upload',
      userId: 'user-1',
      sessionId: 'session-1',
      knowledgeGroupId: 'kg-1',
      fileName: 'report.pdf',
      fileSize: 1200,
      uploadStatus: 'complete'
    }))
  })
})
