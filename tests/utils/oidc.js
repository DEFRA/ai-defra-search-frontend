import crypto from 'crypto'

import Jwt from '@hapi/jwt'

function dateToUnix (date) {
  return Math.floor(date.getTime() / 1000)
}

function generateEntraJwt () {
  return Jwt.token.generate(
    {
      aud: process.env.MS_ENTRA_CLIENT_ID,
      iss: `https://login.microsoftonline.com/${process.env.MS_ENTRA_TENANT_ID}/v2.0`,
      iat: dateToUnix(new Date('2025-11-24T00:00:00Z')),
      exp: dateToUnix(new Date('2025-11-24T00:30:00Z')),
      sub: 'user-id',
      name: 'Test User',
      preferred_username: 'testuser@example.com'
    },
    crypto.randomBytes(256).toString('base64')
  )
}

export {
  dateToUnix,
  generateEntraJwt
}
