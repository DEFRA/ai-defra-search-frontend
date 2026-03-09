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

  test('auditLlmInteraction determines success status from completed assistant messages', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      messages: [
        { role: 'user', content: 'Hello', status: 'completed' },
        { role: 'assistant', content: 'Hi', status: 'completed', model_id: 'sonnet-3-7' }
      ]
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'llm_interaction',
      interactionStatus: 'success',
      modelId: 'sonnet-3-7'
    }))
  })

  test('auditLlmInteraction determines failure status from failed assistant messages', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      messages: [
        { role: 'user', content: 'Hello', status: 'completed' },
        { role: 'assistant', content: 'Error', status: 'failed', model_id: 'haiku' }
      ]
    })

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'llm_interaction',
      interactionStatus: 'failure',
      modelId: 'haiku'
    }))
  })

  test('auditLlmInteraction prioritizes failure status when both completed and failed messages exist', () => {
    auditLlmInteraction({
      userId: 'user-1',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      messages: [
        { role: 'assistant', content: 'First', status: 'completed', model_id: 'sonnet-3-7' },
        { role: 'assistant', content: 'Second', status: 'failed', model_id: 'sonnet-3-7' }
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
      messages: [
        { role: 'assistant', content: 'Thinking...', status: 'pending', model_id: 'sonnet-3-7' }
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
