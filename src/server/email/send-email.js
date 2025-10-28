import notifyClient from './notify-client.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export default async (templateId, email, options) => {
  let success = true
  try {
    const response = await notifyClient.sendEmail(templateId, email, options)
    logger.info(`Email sent to ${email} with template ID ${templateId}. Notify response status: ${response.status}`)
  } catch (e) {
    success = false
    console.error('Error occurred during sending email', e.response.data)
  }
  return success
}
