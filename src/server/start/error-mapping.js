import statusCodes from 'http-status-codes'

const RETRYABLE_STATUS_CODES = [
  statusCodes.TOO_MANY_REQUESTS,
  statusCodes.SERVICE_UNAVAILABLE,
  statusCodes.GATEWAY_TIMEOUT,
  statusCodes.BAD_GATEWAY
]

async function getErrorDetails (error) {
  const errorData = error.response?.data || error.data || {}
  const statusCode = error.response?.status || error.status || errorData.statusCode || statusCodes.INTERNAL_SERVER_ERROR

  return {
    isRetryable: RETRYABLE_STATUS_CODES.includes(statusCode),
    timestamp: new Date()
  }
}

export { getErrorDetails }
