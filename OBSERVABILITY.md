# Observability Dashboard

## Overview

The observability dashboard provides comprehensive monitoring and performance insights for the AI DEFRA Search service. It displays real-time system health, performance metrics, security events, and execution details.

## Features

### System Health Monitoring
- **Basic Health Check**: Shows the overall service status
- **System Health Check**: Detailed health status including database connectivity, error rates, and security events

### Dashboard Summary
- **Execution Statistics**: Total executions, success rates, and average duration over the last 24 hours
- **Security Overview**: Count of security events by severity level
- **Node Performance**: Execution statistics for individual system nodes

### Performance Metrics
- **Execution Metrics**: Success rates, duration statistics, and document retrieval averages
- **Validation Statistics**: Input/output validation failure rates
- **System Performance**: Min/max execution times and throughput metrics

### Security Monitoring
- **Recent Security Events**: List of security events with timestamps, severity levels, and details
- **Security Metrics**: Aggregated security statistics by event type and severity
- **Security Trends**: Historical trend analysis for security events

### Execution Tracking
- **Recent Executions**: List of recent system executions with status and performance data
- **Execution Details**: Detailed drill-down view for individual executions including:
  - User queries and generated answers
  - Source documents used
  - Node-by-node execution timeline
  - Token usage statistics
  - Error details (if applicable)

## API Endpoints

The dashboard integrates with the following observability API endpoints:

### Health Endpoints
- `GET /observability/health` - Basic health check
- `GET /observability/system/health` - Detailed system health

### Dashboard Endpoints
- `GET /observability/dashboard/summary` - Dashboard summary statistics

### Metrics Endpoints
- `GET /observability/metrics/performance` - Performance metrics
- `GET /observability/metrics/nodes` - Node-specific metrics

### Security Endpoints
- `GET /observability/security/events` - Security events list
- `GET /observability/security/metrics` - Security metrics summary
- `GET /observability/security/trends` - Security trends analysis

### Execution Endpoints
- `GET /observability/executions/recent` - Recent executions list
- `GET /observability/executions/{executionId}` - Detailed execution information

## Usage

### Accessing the Dashboard
1. Navigate to `/observability` in your browser
2. The dashboard will automatically load data from all observability endpoints
3. Use the "View details" links in the executions table to drill down into specific executions

### Navigation
- The observability dashboard is accessible from the main navigation menu
- Individual execution details can be accessed via direct URLs: `/observability/execution/{executionId}`

### Data Refresh
- The dashboard shows a "Last updated" timestamp
- Data is fetched fresh on each page load
- For real-time monitoring, manually refresh the page

## Error Handling

The dashboard gracefully handles API failures:
- Individual section failures don't break the entire dashboard
- Unavailable services show appropriate warning messages
- Error details are logged to the console for debugging

## Styling

The dashboard follows GDS (Government Digital Service) design standards:
- Uses GOV.UK Design System components
- Consistent with the rest of the AI DEFRA Search interface
- Responsive design for various screen sizes
- Accessibility compliant

## Files Structure

```
src/server/
├── observability/
│   ├── controller.js          # Request handlers and data formatting
│   ├── index.js              # Route definitions
│   ├── index.njk             # Main dashboard template
│   └── execution-detail.njk  # Execution detail template
└── api-requests/
    └── observability-service.js # API service layer
```

## Configuration

The observability service uses the same API base URL configuration as other services:
- Uses `config.get('apiBaseUrl')` from the application configuration
- No additional configuration required