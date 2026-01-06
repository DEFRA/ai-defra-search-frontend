import yar from '@hapi/yar'

import { config } from '../../../../config/config.js'

const SESSION_CONFIG = config.get('session')

/**
 * Set options.maxCookieSize to 0 to always use server-side storage
 */
export const SESSION_CACHE = {
  plugin: yar,
  options: {
    name: SESSION_CONFIG.cache.name,
    cache: {
      cache: SESSION_CONFIG.cache.name,
      expiresIn: SESSION_CONFIG.cache.ttl
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: SESSION_CONFIG.cookie.password,
      ttl: SESSION_CONFIG.cookie.ttl,
      isSecure: config.get('session.cookie.secure'),
      clearInvalid: true
    }
  }
}
