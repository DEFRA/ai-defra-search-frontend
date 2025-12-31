import * as Hoek from '@hapi/hoek'

import {
  headersMap,
  arrayValues
} from '../constants.js'

const FIREFOX_VERSION_4 = 4
const FIREFOX_VERSION_5 = 5
const FIREFOX_VERSION_23 = 23

function getFirefoxPolicyOptions (options, version) {
  if (version === FIREFOX_VERSION_4) {
    return _getFirefox4PolicyOptions(options, version)
  }

  if (version >= FIREFOX_VERSION_5 && version <= FIREFOX_VERSION_23) {
    return _getFirefoxPolicyLegacyOptions(options, version)
  }

  return {
    headerName: headersMap.default,
    policyOptions: options
  }
}

/**
 * @private
 * Retrieves the Firefox-specific policy options based on the provided options and browser version.
 *
 * @param {object} options
 * @param {number} version
 * @returns
 */
function _getFirefoxPolicyLegacyOptions (options, version) {
  const enrichedOptions = Hoek.clone(options)

  // connect-src -> xhr-src
  enrichedOptions.xhrSrc = enrichedOptions.connectSrc
  delete enrichedOptions.connectSrc

  // no sandbox support
  delete enrichedOptions.sandbox

  // "unsafe-inline" -> "inline-script"
  // "unsafe-eval" -> "eval-script"
  enrichedOptions.scriptSrc = enrichedOptions.scriptSrc.map((value) => {
    if (value === '\'unsafe-inline\'') {
      return '\'inline-script\''
    }

    if (value === '\'unsafe-eval\'') {
      return '\'eval-script\''
    }

    return value
  })

  // remove "unsafe-inline" and "unsafe-eval" from other directives
  for (const key of arrayValues) {
    if (!enrichedOptions[key]) {
      continue
    }

    enrichedOptions[key] = enrichedOptions[key].filter((value) => {
      return value !== '\'unsafe-inline\'' && value !== '\'unsafe-eval\''
    })

    if (!enrichedOptions[key].length) {
      enrichedOptions[key] = null
    }
  }

  return {
    headerName: version >= FIREFOX_VERSION_5 && version <= FIREFOX_VERSION_23 ? headersMap.custom : headersMap.default,
    policyOptions: enrichedOptions
  }
}

/**
 * @private
 * Applies Firefox 4 specific modifications to the policy options.
 *
 * @param {object} options
 * @param {number} version
 * @returns {{headerName: string, policyOptions: object}} The header name and policy options for Firefox 4.
 */
function _getFirefox4PolicyOptions (options, version) {
  const { policyOptions } = _getFirefoxPolicyLegacyOptions(options, version)

  // firefox 4 uses "allow" instead of "default-src"
  const defaultSrc = policyOptions.defaultSrc

  if (defaultSrc) {
    policyOptions['allow'] = defaultSrc
    delete policyOptions.defaultSrc
  }

  return {
    headerName: headersMap.custom,
    policyOptions
  }
}

export {
  getFirefoxPolicyOptions
}
