import { pino } from 'pino'

import { LOGGER_OPTIONS } from './logger-options.js'

const LOGGER = pino(LOGGER_OPTIONS)

function createLogger () {
  return LOGGER
}

export { createLogger }
