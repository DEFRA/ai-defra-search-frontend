import {
  headersMap
} from '../constants.js'

const CHROME_14 = 14
const CHROME_25 = 25

/**
 * Retrieves the Chrome-specific policy options based on the provided options and browser version.
 *
 * @param {object} options
 * @param {number} version
 * @returns {{headerName: string, policyOptions: object}} The header name and policy options for Chrome.
 */
function getChromePolicyOptions (options, version) {
  return {
    headerName: version >= CHROME_14 && version <= CHROME_25 ? headersMap.webkit : headersMap.default,
    policyOptions: options
  }
}

export {
  getChromePolicyOptions
}
