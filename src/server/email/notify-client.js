import { config } from '../../config/config.js'
import { NotifyClient } from 'notifications-node-client'

import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()
const notifyConfig = config.get('notify')

logger.info('Notify client initialized')

export default new NotifyClient(notifyConfig.apiKey)
