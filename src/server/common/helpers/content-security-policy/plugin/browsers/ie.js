import * as Hoek from '@hapi/hoek'

import {
  headersMap
} from '../constants.js'

/**
 * Retrieves the Internet Explorer-specific policy options based on the provided options.
 *
 * @param {object} options
 * @returns {{headerName: string, policyOptions: object}} The header name and policy options for Internet Explorer.
 */
function getInternetExplorerPolicyOptions (options) {
  const { sandbox } = Hoek.clone(options)

  return {
    headerName: headersMap.custom,
    policyOptions: {
      sandbox
    }
  }
}

export {
  getInternetExplorerPolicyOptions
}
