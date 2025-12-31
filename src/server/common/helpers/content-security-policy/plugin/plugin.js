/**
 * Content Security Policy (CSP) plugin for Hapi.js
 *
 * This plugin is based on the blankie library: https://github.com/nlf/blankie
 * It provides Content Security Policy header generation with browser-specific
 * implementations for Firefox, Chrome, Safari, and Internet Explorer.
 *
 * @module contentSecurityPolicy/plugin
 */

import crypto from 'node:crypto'

import * as Hoek from '@hapi/hoek'

import {
  directiveMap,
  directiveNames,
  keyToConfigMap,
  stringValues
} from './constants.js'

import { validateOptions } from './schema.js'
import { getDefaultPolicyOptions } from './browsers/generic.js'
import { getFirefox4PolicyOptions, getFirefoxPolicyOptions } from './browsers/firefox.js'
import { getChromePolicyOptions } from './browsers/chrome.js'
import { getSafariPolicyOptions } from './browsers/safari.js'
import { getInternetExplorerPolicyOptions } from './browsers/ie.js'

function _nonceShouldBeGenerated (options, key) {
  return options.generateNonces === true || options.generateNonces === keyToConfigMap[key]
}

function _generateNonce () {
  const bytes = crypto.randomBytes(16)

  return bytes.toString('hex')
}

/**
 * @private
 * Generates the Content Security Policy header string based on the provided options.
 *
 * @param {object} options - The policy options.
 * @param {import('@hapi/hapi').Request} request - The Hapi request object.
 * @returns {string} The generated Content Security Policy header string.
 */
function _generatePolicy (options, request) {
  const policy = []

  // map the camel case names to proper directive names
  // and join their values into strings
  for (const key of directiveNames) {
    if (!options[key]) {
      continue
    }

    const directive = directiveMap[key] || key

    if (stringValues.indexOf(key) >= 0) {
      policy.push(`${directive} ${options[key]}`)
      continue
    }

    if (key === 'sandbox' && options[key] === true) {
      // it's allowed to have a sandbox directive with no value
      policy.push('sandbox')
      continue
    }

    if ((key === 'scriptSrc' || key === 'styleSrc') && _nonceShouldBeGenerated(options, key)) {
      const nonce = request.plugins.contentSecurityPolicy ? request.plugins.contentSecurityPolicy.nonces[keyToConfigMap[key]] : _generateNonce()
      const sources = Hoek.clone(options[key])

      sources.push(`'nonce-${nonce}'`)
      policy.push(`${directive} ${sources.join(' ')}`)

      if (request.response.variety === 'view') {
        request.response.source.context = Hoek.applyToDefaults({ nonce }, request.response.source.context || {})
        request.response.source.context[`${key.slice(0, -3)}-nonce`] = nonce
      }

      continue
    }

    policy.push(`${directive} ${options[key].join(' ')}`)
  }

  return policy.join(';')
}

/**
 * @private
 * Retrieves the policy options based on the user agent of the request.
 *
 * @param {import('ua-parser-js').IData} userAgent
 * @param {object} options
 * @returns {{headerName: string, policyOptions: object}} The header name and policy options for the specific browser.
 */
function _getOptionsByUserAgent (userAgent, options) {
  const browser = userAgent.name?.toLowerCase()
  const version = Number.parseInt(userAgent.major, 10)

  switch (browser) {
    case 'chrome':
      return getChromePolicyOptions(options, version)
    case 'firefox':
      if (version === 4) {
        return getFirefox4PolicyOptions(options, version)
      }

      if (version >= 5 && version <= 23) {
        return getFirefoxPolicyOptions(options, version)
      }

      return getDefaultPolicyOptions(options)
    case 'safari':
      return getSafariPolicyOptions(options, version)
    case 'ie':
      return getInternetExplorerPolicyOptions(options)
    default:
      return getDefaultPolicyOptions(options)
  }
}

function _attachNonces (request, h) {
  if (request.method === 'options' ||
        request.route.settings.plugins.contentSecurityPolicy === false) {
    return h.continue
  }

  const options = _getOptions(request)

  if (!options) {
    return h.continue
  }

  for (const key of ['scriptSrc', 'styleSrc']) {
    if (_nonceShouldBeGenerated(options, key)) {
      const nonce = _generateNonce()
      request.plugins.contentSecurityPolicy = Object.assign({}, request.plugins.contentSecurityPolicy)
      request.plugins.contentSecurityPolicy.nonces = Object.assign({}, request.plugins.contentSecurityPolicy.nonces)
      request.plugins.contentSecurityPolicy.nonces[keyToConfigMap[key]] = nonce
    }
  }

  return h.continue
}

/**
 * @private
 * Checks whether CSP headers should be skipped for a given request.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {boolean} True if CSP headers should be skipped, false otherwise.
 */
function _shouldSkipCsp (request) {
  const contentType = (request.response.headers || request.response.output.headers)['content-type']

  if (request.method === 'options') {
    return true
  }

  if (request.route.settings.plugins.contentSecurityPolicy === false) {
    return true
  }

  if (contentType && contentType !== 'text/html') {
    return true
  }

  return false
}

/**
 * @private
 * Retrieves the options for the Content Security Policy plugin based on the request.
 *
 * Overrides are applied in the following order:
 * 1. Route-specific overrides
 * 2. Callback function provided during plugin registration
 * 3. Default plugin options
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {object|null} The resolved options object or null if invalid.
 */
function _getOptions (request) {
  const pluginState = request.server.plugins.contentSecurityPolicy
  const routeOverride = request.route.settings.plugins.contentSecurityPolicy

  if (routeOverride) {
    const options = validateOptions(routeOverride)

    if (options instanceof Error) {
      request.server.log(['error', 'contentSecurityPolicy'], `Invalid contentSecurityPolicy configuration on route: ${request.route.path}`)

      return null
    }

    return options
  }

  if (pluginState.cspCallback) {
    const options = validateOptions(pluginState.cspCallback(request))

    if (options instanceof Error) {
      request.server.log(['error', 'contentSecurityPolicy'], 'Invalid contentSecurityPolicy configuration from CSP Callback')

      return null
    }

    return options
  }

  return Hoek.clone(pluginState.options)
}

/**
 * @private
 *
 * Pre-response handler to add Content Security Policy headers to the response.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject} The response with CSP headers added.
 */
function _addCspHeaders (request, h) {
  if (_shouldSkipCsp(request)) {
    return h.continue
  }

  const options = _getOptions(request)

  if (!options) {
    return h.continue
  }

  const userAgent = request.plugins.userAgentParser || {}

  const { headerName, policyOptions } = _getOptionsByUserAgent(userAgent, options)
  const finalHeaderName = options.reportOnly ? `${headerName}-Report-Only` : headerName

  const policy = _generatePolicy(policyOptions, request)

  if (request.response.isBoom) {
    request.response.output.headers[finalHeaderName] = policy
  } else {
    request.response.headers[finalHeaderName] = policy
  }

  return h.continue
}

const plugin = {
  name: 'contentSecurityPolicy',
  register: function (server, options) {
    const pluginState = {
      cspCallback: null,
      options: null
    }

    if (typeof options === 'function') {
      pluginState.cspCallback = options
    } else {
      pluginState.options = validateOptions(options)
      if (pluginState.options instanceof Error) {
        throw pluginState.options
      }
    }

    server.expose(pluginState)

    server.ext('onPreHandler', _attachNonces)
    server.ext('onPreResponse', _addCspHeaders)
  },
  dependencies: ['userAgentParser'],
  once: true
}

export {
  plugin
}
