const arrayValues = [
  'allow',
  'baseUri',
  'childSrc',
  'connectSrc',
  'defaultSrc',
  'fontSrc',
  'formAction',
  'frameAncestors',
  'frameSrc',
  'imgSrc',
  'manifestSrc',
  'mediaSrc',
  'objectSrc',
  'pluginTypes',
  'requireSriFor',
  'sandbox',
  'scriptSrc',
  'styleSrc',
  'workerSrc',
  'xhrSrc'
]

const stringValues = [
  'reportUri',
  'reflectedXss'
]

const directiveNames = arrayValues.concat(stringValues)

const directiveMap = {
  allow: 'allow',
  baseUri: 'base-uri',
  childSrc: 'child-src',
  connectSrc: 'connect-src',
  defaultSrc: 'default-src',
  fontSrc: 'font-src',
  formAction: 'form-action',
  frameAncestors: 'frame-ancestors',
  frameSrc: 'frame-src',
  imgSrc: 'img-src',
  manifestSrc: 'manifest-src',
  mediaSrc: 'media-src',
  objectSrc: 'object-src',
  pluginTypes: 'plugin-types',
  reflectedXss: 'reflected-xss',
  reportUri: 'report-uri',
  requireSriFor: 'require-sri-for',
  scriptSrc: 'script-src',
  styleSrc: 'style-src',
  workerSrc: 'worker-src',
  xhrSrc: 'xhr-src'
}

const headersMap = {
  default: 'Content-Security-Policy',
  custom: 'X-Content-Security-Policy',
  webkit: 'X-WebKit-CSP'
}

const allHeaders = [
  headersMap.default,
  headersMap.custom,
  headersMap.webkit
]

const needQuotes = [
  'self',
  'none',
  'unsafe-inline',
  'unsafe-eval',
  'inline-script',
  'eval-script',
  'strict-dynamic'
]

const keyToConfigMap = {
  scriptSrc: 'script',
  styleSrc: 'style'
}

export {
  arrayValues,
  directiveMap,
  directiveNames,
  headersMap,
  allHeaders,
  needQuotes,
  stringValues,
  keyToConfigMap
}
