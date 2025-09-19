import { observabilityService } from '../api-requests/observability-service.js'

export const observabilityController = {

  async handler(request, h) {
    try {
      const [
        healthResult,
        systemHealthResult,
        dashboardResult,
        performanceResult,
        securityEventsResult,
        securityMetricsResult,
        recentExecutionsResult
      ] = await Promise.all([
        observabilityService.getHealth(),
        observabilityService.getSystemHealth(),
        observabilityService.getDashboardSummary(),
        observabilityService.getPerformanceMetrics(),
        observabilityService.getSecurityEvents(),
        observabilityService.getSecurityMetrics(),
        observabilityService.getRecentExecutions()
      ])

      const viewData = {
        pageTitle: 'Observability Dashboard - AI DEFRA Search',
        heading: 'Observability Dashboard',
        serviceName: 'AI DEFRA Search',
        phaseTag: 'Beta',
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Observability Dashboard'
          }
        ],
        health: observabilityController.formatHealthData(healthResult, systemHealthResult),
        dashboard: observabilityController.formatDashboardData(dashboardResult),
        performance: observabilityController.formatPerformanceData(performanceResult),
        security: observabilityController.formatSecurityData(securityEventsResult, securityMetricsResult),
        executions: observabilityController.formatExecutionsData(recentExecutionsResult),
        lastUpdated: observabilityService.formatTimestamp(new Date().toISOString())
      }

      return h.view('observability/index', viewData)
    } catch (error) {
      console.error('Error fetching observability data:', error)
      return h.view('observability/index', {
        pageTitle: 'Observability Dashboard - AI DEFRA Search',
        heading: 'Observability Dashboard',
        serviceName: 'AI DEFRA Search',
        phaseTag: 'Beta',
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Observability Dashboard'
          }
        ],
        error: 'Unable to fetch observability data. Please try again later.',
        lastUpdated: observabilityService.formatTimestamp(new Date().toISOString())
      })
    }
  },

  async executionDetailHandler(request, h) {
    const { executionId } = request.params

    try {
      const executionResult = await observabilityService.getExecutionDetail(executionId)

      if (!executionResult.success) {
        return h.response('Execution not found').code(404)
      }

      const viewData = {
        pageTitle: `Execution ${executionId} - Observability Dashboard`,
        heading: `Execution Details`,
        serviceName: 'AI DEFRA Search',
        phaseTag: 'Beta',
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Observability Dashboard',
            href: '/observability'
          },
          {
            text: `Execution ${executionId.substring(0, 8)}...`
          }
        ],
        execution: observabilityController.formatExecutionDetail(executionResult.data),
        lastUpdated: observabilityService.formatTimestamp(new Date().toISOString())
      }

      return h.view('observability/execution-detail', viewData)
    } catch (error) {
      console.error('Error fetching execution detail:', error)
      return h.response('Error fetching execution details').code(500)
    }
  },


  formatHealthData(healthResult, systemHealthResult) {
    const health = {
      basic: {
        available: healthResult.success,
        status: healthResult.success ? 
          observabilityService.formatHealthStatus(healthResult.data.status) : 
          { text: 'Unavailable', class: 'govuk-tag--red' },
        timestamp: healthResult.success ? 
          observabilityService.formatTimestamp(healthResult.data.timestamp) : 
          'N/A'
      },
      system: {
        available: systemHealthResult.success,
        status: systemHealthResult.success ? 
          observabilityService.formatHealthStatus(systemHealthResult.data.status) : 
          { text: 'Unavailable', class: 'govuk-tag--red' },
        checks: systemHealthResult.success ? systemHealthResult.data.checks : {},
        issues: systemHealthResult.success ? systemHealthResult.data.issues : [],
        metrics: systemHealthResult.success ? systemHealthResult.data.metrics : {}
      }
    }

    return health
  },

  formatDashboardData(dashboardResult) {
    if (!dashboardResult.success) {
      return { available: false }
    }

    const data = dashboardResult.data
    return {
      available: true,
      periodHours: data.period_hours,
      summary: {
        executions: {
          total: data.summary.executions.total,
          successful: data.summary.executions.successful,
          failed: data.summary.executions.failed,
          successRate: observabilityService.formatPercentage(data.summary.executions.success_rate),
          avgDuration: observabilityService.formatDuration(data.summary.executions.avg_duration_ms)
        },
        security: data.summary.security,
        nodes: data.summary.nodes
      },
      timestamp: observabilityService.formatTimestamp(data.timestamp)
    }
  },

  formatPerformanceData(performanceResult) {
    if (!performanceResult.success) {
      return { available: false }
    }

    const data = performanceResult.data
    return {
      available: true,
      periodHours: data.period_hours,
      metrics: {
        totalExecutions: data.metrics.total_executions,
        successfulExecutions: data.metrics.successful_executions,
        failedExecutions: data.metrics.failed_executions,
        successRate: observabilityService.formatPercentage(data.metrics.success_rate),
        avgDuration: observabilityService.formatDuration(data.metrics.avg_duration_ms),
        minDuration: observabilityService.formatDuration(data.metrics.min_duration_ms),
        maxDuration: observabilityService.formatDuration(data.metrics.max_duration_ms),
        avgDocumentsRetrieved: data.metrics.avg_documents_retrieved,
        validationFailureRate: observabilityService.formatPercentage(data.metrics.validation_failure_rate)
      }
    }
  },

  formatSecurityData(eventsResult, metricsResult) {
    const events = {
      available: eventsResult.success,
      list: eventsResult.success ? eventsResult.data.events.map(event => ({
        id: event._id,
        timestamp: observabilityService.formatTimestamp(event.timestamp),
        eventType: event.event_type,
        userQuery: event.user_query,
        severity: observabilityService.formatSeverity(event.severity),
        details: event.details,
        responseAction: event.response_action
      })) : [],
      count: eventsResult.success ? eventsResult.data.count : 0,
      tableRows: []
    }

    if (eventsResult.success) {
      events.tableRows = eventsResult.data.events.map(event => [
        {
          text: observabilityService.formatTimestamp(event.timestamp)
        },
        {
          text: event.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        },
        {
          html: `<span class="govuk-tag ${observabilityService.formatSeverity(event.severity).class}">${observabilityService.formatSeverity(event.severity).text}</span>`
        },
        {
          text: event.details
        }
      ])
    }

    const security = {
      events,
      metrics: {
        available: metricsResult.success,
        data: metricsResult.success ? metricsResult.data.security_metrics : {}
      }
    }

    return security
  },

  formatExecutionsData(executionsResult) {
    if (!executionsResult.success) {
      return { available: false }
    }

    const executions = executionsResult.data.executions.map(execution => ({
      id: execution._id,
      executionId: execution.execution_id,
      shortExecutionId: execution.execution_id.substring(0, 8),
      timestamp: observabilityService.formatTimestamp(execution.timestamp),
      status: observabilityService.formatExecutionStatus(execution.status),
      duration: observabilityService.formatDuration(execution.total_duration_ms),
      documentsCount: execution.source_documents_count,
      inputValidation: execution.input_validation_passed ? 'Passed' : 'Failed',
      outputValidation: execution.output_validation_passed ? 'Passed' : 'Failed'
    }))

    const tableRows = executions.map(execution => [
      {
        text: execution.shortExecutionId + '...'
      },
      {
        text: execution.timestamp
      },
      {
        html: `<span class="govuk-tag ${execution.status.class}">${execution.status.text}</span>`
      },
      {
        text: execution.duration
      },
      {
        text: execution.documentsCount
      },
      {
        html: `<a href="/observability/execution/${execution.executionId}" class="govuk-link">View details</a>`
      }
    ])

    return {
      available: true,
      executions,
      tableRows,
      count: executionsResult.data.count
    }
  },

  formatExecutionDetail(executionData) {
    const execution = executionData.execution
    const nodes = executionData.nodes

    const formattedNodes = nodes.map(node => ({
      id: node.node_id,
      name: node.node_name,
      type: node.node_type,
      status: observabilityService.formatExecutionStatus(node.status),
      timestamp: observabilityService.formatTimestamp(node.timestamp),
      duration: node.duration_ms ? observabilityService.formatDuration(node.duration_ms) : 'N/A',
      inputSize: node.input_size_bytes,
      outputSize: node.output_size_bytes
    }))

    const nodeTableRows = formattedNodes.map(node => [
      {
        text: node.name
      },
      {
        text: node.type
      },
      {
        html: `<span class="govuk-tag ${node.status.class}">${node.status.text}</span>`
      },
      {
        text: node.timestamp
      },
      {
        text: node.duration
      },
      {
        text: node.inputSize + ' bytes'
      },
      {
        text: node.outputSize + ' bytes'
      }
    ])

    return {
      basic: {
        id: execution._id,
        executionId: execution.execution_id,
        timestamp: observabilityService.formatTimestamp(execution.timestamp),
        query: execution.query,
        status: observabilityService.formatExecutionStatus(execution.status),
        duration: observabilityService.formatDuration(execution.total_duration_ms),
        startTime: observabilityService.formatTimestamp(execution.start_time),
        endTime: observabilityService.formatTimestamp(execution.end_time)
      },
      validation: {
        input: execution.input_validation_passed,
        output: execution.output_validation_passed
      },
      documents: {
        count: execution.source_documents_count,
        list: execution.source_documents || []
      },
      answer: execution.answer,
      nodes: formattedNodes,
      nodeTableRows,
      tokenUsage: execution.token_usage,
      error: execution.error_message ? {
        message: execution.error_message,
        type: execution.error_type,
        stackTrace: execution.stack_trace
      } : null
    }
  }
}