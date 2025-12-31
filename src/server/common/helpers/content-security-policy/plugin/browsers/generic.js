import {
  headersMap
} from '../constants.js'

/**
 * Retrieves the default policy options based on the provided options.
 *
 * @param {object} options
 * @returns {{headerName: string, policyOptions: object}} The header name and policy options.
 */
function getDefaultPolicyOptions (options) {
  return {
    headerName: headersMap.default,
    policyOptions: options
  }
}

export {
  getDefaultPolicyOptions
}
