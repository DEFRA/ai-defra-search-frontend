import hapiPulse from 'hapi-pulse'

import { createLogger } from './logging/logger.js'

const TEN_SECONDS = 10 * 1000

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: createLogger(),
    timeout: TEN_SECONDS
  }
}

export { pulse }
