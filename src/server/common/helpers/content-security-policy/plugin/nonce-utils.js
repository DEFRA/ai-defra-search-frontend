import crypto from 'node:crypto'

import { keyToConfigMap } from './constants.js'

/**
 * Checks if a nonce should be generated for the given key.
 *
 * @param {object} options - The policy options.
 * @param {string} key - The directive key.
 * @returns {boolean} True if a nonce should be generated.
 */
function nonceShouldBeGenerated (options, key) {
  return options.generateNonces === true || options.generateNonces === keyToConfigMap[key]
}

/**
 * Generates a cryptographically random nonce.
 *
 * @returns {string} A hexadecimal nonce string.
 */
function generateNonce () {
  const bytes = crypto.randomBytes(16)

  return bytes.toString('hex')
}

export {
  nonceShouldBeGenerated,
  generateNonce
}
