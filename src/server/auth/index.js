import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

const lookupToken = async (request, token) => {
  const { magiclinkCache } = request.server.app
  return (await magiclinkCache.get(token)) ?? {}
}

const setAuthCookie = (request, email, userType) => {
  request.cookieAuth.set({ email, userType })
  logger.info(`Logged in user of type '${userType}' with email '${email}'.`)
}

export { lookupToken, setAuthCookie }
