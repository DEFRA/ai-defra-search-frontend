import * as Hoek from '@hapi/hoek'

import {
  directiveMap,
  directiveNames,
  keyToConfigMap,
  nonceContextKeys,
  stringValues
} from './constants.js'

import { nonceShouldBeGenerated, generateNonce } from './nonce-utils.js'

/**
 * @private
 * Generates a directive string for string-valued CSP options.
 *
 * @param {string} directive - The CSP directive name.
 * @param {string} value - The directive value.
 * @returns {string} The formatted directive string.
 */
function _generateStringDirective (directive, value) {
  return `${directive} ${value}`
}

/**
 * @private
 * Generates a directive string with nonce for script or style sources.
 *
 * @param {string} key - The directive key (scriptSrc or styleSrc).
 * @param {string} directive - The CSP directive name.
 * @param {object} options - The policy options.
 * @param {import('@hapi/hapi').Request} request - The Hapi request object.
 * @returns {string} The directive string with nonce.
 */
function _generateNonceDirective (key, directive, options, request) {
  const nonce = request.plugins.contentSecurityPolicy ? request.plugins.contentSecurityPolicy.nonces[keyToConfigMap[key]] : generateNonce()
  const sources = Hoek.clone(options[key])

  sources.push(`'nonce-${nonce}'`)

  if (request.response.variety === 'view') {
    request.response.source.context = Hoek.applyToDefaults({ nonce }, request.response.source.context || {})
    request.response.source.context[nonceContextKeys[key]] = nonce
  }

  return `${directive} ${sources.join(' ')}`
}

/**
 * @private
 * Generates a directive string for array-valued CSP options.
 *
 * @param {string} directive - The CSP directive name.
 * @param {Array<string>} values - The directive values.
 * @returns {string} The formatted directive string.
 */
function _generateArrayDirective (directive, values) {
  return `${directive} ${values.join(' ')}`
}

/**
 * @private
 * Generates a single directive string based on the key and options.
 *
 * @param {string} key - The directive key.
 * @param {object} options - The policy options.
 * @param {import('@hapi/hapi').Request} request - The Hapi request object.
 * @returns {string|null} The generated directive string or null if not applicable.
 */
function _generateDirective (key, options, request) {
  if (!options[key]) {
    return null
  }

  const directive = directiveMap[key] || key

  if (stringValues.includes(key)) {
    return _generateStringDirective(directive, options[key])
  }

  if (key === 'sandbox' && options[key] === true) {
    return 'sandbox'
  }

  if ((key === 'scriptSrc' || key === 'styleSrc') && nonceShouldBeGenerated(options, key)) {
    return _generateNonceDirective(key, directive, options, request)
  }

  return _generateArrayDirective(directive, options[key])
}

/**
 * Generates the Content Security Policy header string based on the provided options.
 *
 * @param {object} options - The policy options.
 * @param {import('@hapi/hapi').Request} request - The Hapi request object.
 * @returns {string} The generated Content Security Policy header string.
 */
function generatePolicy (options, request) {
  const policy = []

  // map the camel case names to proper directive names
  // and join their values into strings
  for (const key of directiveNames) {
    const directiveString = _generateDirective(key, options, request)

    if (directiveString) {
      policy.push(directiveString)
    }
  }

  return policy.join(';')
}

export {
  generatePolicy
}
