import statusCodes from 'http-status-codes'

const TERMINAL_STATUS_CODES = [
  statusCodes.BAD_REQUEST
]

const RETRYABLE_STATUS_CODES = [
  statusCodes.TOO_MANY_REQUESTS,
  statusCodes.INTERNAL_SERVER_ERROR,
  statusCodes.SERVICE_UNAVAILABLE,
  statusCodes.GATEWAY_TIMEOUT
]

export function classifyError (error) {
  const errorDetails = error.response?.data || error.data || {}
  const statusCode = error.response?.status || error.status || errorDetails.statusCode || statusCodes.INTERNAL_SERVER_ERROR

  const isRetryable = RETRYABLE_STATUS_CODES.includes(statusCode) ||
    (!TERMINAL_STATUS_CODES.includes(statusCode) && statusCode >= statusCodes.INTERNAL_SERVER_ERROR)

  return {
    status: statusCode,
    isRetryable,
    details: errorDetails
  }
}
