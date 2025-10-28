import { userData } from './keys.js'

const { emailAddress: emailAddressKey } = userData

function setWithKey(request, entryKey, key, value) {
  const entryValue = request.yar?.get(entryKey) || {}

  if (!entryValue[key]) {
    entryValue[key] = []
  }

  if (Array.isArray(entryValue[key])) {
    entryValue[key].push(typeof value === 'string' ? value.trim() : value)
  } else {
    entryValue[key] = [
      entryValue[key],
      typeof value === 'string' ? value.trim() : value
    ]
  }

  request.yar.set(entryKey, entryValue)
}

function get(request, entryKey) {
  return request.yar?.get(entryKey)
}

function set(request, entryKey, entryValue) {
  return request.yar.set(entryKey, entryValue)
}

function getbyKey(request, entryKey, key) {
  return key ? request.yar?.get(entryKey)?.[key] : request.yar?.get(entryKey)
}

function hasSessionWithProperty(request, property) {
  const sessionStore = request.yar?._store || {}
  return (
    Object.prototype.hasOwnProperty.call(sessionStore, property) &&
    Object.keys(sessionStore).length > 0
  )
}

function clearSession(request) {
  request.yar.clear(emailAddressKey)
}

function getEmailAddress(request) {
  return request.yar?.get(emailAddressKey)
}

export { get, set, getbyKey, setWithKey, hasSessionWithProperty, clearSession, getEmailAddress }
