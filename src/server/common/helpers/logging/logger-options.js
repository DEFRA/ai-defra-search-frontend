import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'

const LOG_CONFIG = config.get('log')
const SERVICE_NAME = config.get('serviceName')
const SERVICE_VERSION = config.get('serviceVersion')

const FORMATTERS = {
  ecs: {
    ...ecsFormat({
      serviceVersion: SERVICE_VERSION,
      serviceName: SERVICE_NAME
    })
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

export const LOGGER_OPTIONS = {
  enabled: LOG_CONFIG.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: LOG_CONFIG.redact,
    remove: true
  },
  level: LOG_CONFIG.level,
  ...FORMATTERS[LOG_CONFIG.format],
  nesting: true,
  mixin () {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}
