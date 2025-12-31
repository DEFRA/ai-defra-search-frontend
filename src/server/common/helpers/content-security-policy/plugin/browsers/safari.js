import {
  headersMap
} from '../constants.js'

const SAFARI_5 = 5
const SAFARI_6 = 6

/**
 * Retrieves the Safari-specific policy options based on the provided options and browser version.
 *
 * @param {object} options
 * @param {number} version
 * @returns {{headerName: string, policyOptions: object}} The header name and policy options for Safari.
 */
function getSafariPolicyOptions (options, version) {
  return {
    headerName: (version === SAFARI_6 || (version === SAFARI_5 && options.oldSafari)) ? headersMap.webkit : headersMap.default,
    policyOptions: options
  }
}

export {
  getSafariPolicyOptions
}
