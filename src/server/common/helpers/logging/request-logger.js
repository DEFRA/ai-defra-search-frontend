import hapiPino from 'hapi-pino'

import { LOGGER_OPTIONS } from './logger-options.js'

export const requestLogger = {
  plugin: hapiPino,
  options: LOGGER_OPTIONS
}
