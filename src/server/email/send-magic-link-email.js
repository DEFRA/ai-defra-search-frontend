import { config } from '../../config/config.js'
import getToken from '../auth/get-token.js'
import sendEmail from './send-email.js'
import { generalUser } from '../common/constants/user-types.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

const notifyConfig = config.get('notify')
const serviceUri = config.get('serviceUri')

async function createAndCacheToken(request, email, redirectTo, userType, data) {
  const { magiclinkCache } = request.server.app

  const token = await getToken(email)
  const tokens = (await magiclinkCache.get(email)) ?? []
  tokens.push(token)
  await magiclinkCache.set(email, tokens)
  await magiclinkCache.set(token, { email, redirectTo, userType, data })
  return token
}

async function sendMagicLinkEmail(
  request,
  email,
  templateId,
  redirectTo,
  userType,
  data
) {
  const token = await createAndCacheToken(
    request,
    email,
    redirectTo,
    userType,
    data
  )
  logger.info(`Sending magic link email: ${email}`)
  return sendEmail(templateId, email, {
    personalisation: {
      magiclink: `${serviceUri}/verify-login?token=${token}&email=${email}`,
      reference: token
    },
    reference: token
  })
}

async function sendMagicLink(request, email) {
  return sendMagicLinkEmail(
    request,
    email,
    notifyConfig.templateId,
    '/',
    generalUser
  )
}

export { sendMagicLink }
