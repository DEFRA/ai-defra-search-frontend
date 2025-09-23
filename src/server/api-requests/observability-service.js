// Token usage metrics endpoint
import { config } from '../../config/config.js'
import { proxyFetch } from '../common/helpers/proxy/proxy-fetch.js'

export class ObservabilityService {
  constructor() {
    this.baseUrl = config.get('apiBaseUrl')
    this.healthEndpoint = '/observability/health'
    this.systemHealthEndpoint = '/observability/system/health'
    this.dashboardSummaryEndpoint = '/observability/dashboard/summary'
    this.performanceMetricsEndpoint = '/observability/metrics/performance'
    this.nodeMetricsEndpoint = '/observability/metrics/nodes'
    this.securityEventsEndpoint = '/observability/security/events'
    this.securityMetricsEndpoint = '/observability/security/metrics'
    this.securityTrendsEndpoint = '/observability/security/trends'
    this.recentExecutionsEndpoint = '/observability/executions/recent'
    this.executionDetailEndpoint = '/observability/executions'
  }

  async makeRequest(endpoint) {
    const url = `${this.baseUrl}${endpoint}`
    console.log(`Making request to: ${url}`)

    try {
      const response = await proxyFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error(
          `HTTP error! status: ${response.status}, statusText: ${response.statusText}`
        )
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Successfully fetched data from ${endpoint}`)
      return {
        success: true,
        data
      }
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error)
      return {
        success: false,
        error: error.message,
        endpoint
      }
    }
  }

  // Health endpoints
  async getHealth() {
    return await this.makeRequest(this.healthEndpoint)
  }

  async getSystemHealth() {
    return await this.makeRequest(this.systemHealthEndpoint)
  }

  // Dashboard endpoints
  async getDashboardSummary() {
    return await this.makeRequest(this.dashboardSummaryEndpoint)
  }

  // Metrics endpoints
  async getPerformanceMetrics() {
    return await this.makeRequest(this.performanceMetricsEndpoint)
  }

  async getNodeMetrics() {
    return await this.makeRequest(this.nodeMetricsEndpoint)
  }

  // Security endpoints
  async getSecurityEvents() {
    return await this.makeRequest(this.securityEventsEndpoint)
  }

  async getSecurityMetrics() {
    return await this.makeRequest(this.securityMetricsEndpoint)
  }

  async getSecurityTrends() {
    return await this.makeRequest(this.securityTrendsEndpoint)
  }

  // Execution endpoints
  async getRecentExecutions() {
    return await this.makeRequest(this.recentExecutionsEndpoint)
  }

  async getExecutionDetail(executionId) {
    const endpoint = `${this.executionDetailEndpoint}/${executionId}`
    return await this.makeRequest(endpoint)
  }

  // Utility methods for formatting data
  formatHealthStatus(status) {
    const statusMap = {
      healthy: { text: 'Healthy', class: 'govuk-tag--green' },
      unhealthy: { text: 'Unhealthy', class: 'govuk-tag--red' },
      warning: { text: 'Warning', class: 'govuk-tag--yellow' }
    }
    return statusMap[status] || { text: status, class: 'govuk-tag--grey' }
  }

  formatPercentage(value) {
    return `${Math.round(value * 100) / 100}%`
  }

  formatDuration(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`
    }
    return `${Math.round((milliseconds / 1000) * 100) / 100}s`
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  formatSeverity(severity) {
    const severityMap = {
      high: { text: 'High', class: 'govuk-tag--red' },
      medium: { text: 'Medium', class: 'govuk-tag--yellow' },
      low: { text: 'Low', class: 'govuk-tag--green' }
    }
    return severityMap[severity] || { text: severity, class: 'govuk-tag--grey' }
  }

  formatExecutionStatus(status) {
    const statusMap = {
      completed: { text: 'Completed', class: 'govuk-tag--green' },
      failed: { text: 'Failed', class: 'govuk-tag--red' },
      running: { text: 'Running', class: 'govuk-tag--blue' },
      pending: { text: 'Pending', class: 'govuk-tag--grey' }
    }
    return statusMap[status] || { text: status, class: 'govuk-tag--grey' }
  }
}

// Add the method inside the class
ObservabilityService.prototype.getTokenUsageMetrics = async function (
  hours = 24
) {
  const endpoint = `/observability/metrics/token-usage?hours=${encodeURIComponent(hours)}`
  return await this.makeRequest(endpoint)
}

export const observabilityService = new ObservabilityService()
