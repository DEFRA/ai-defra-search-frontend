import { config } from '../../config/config.js'
import { v4 as uuid } from 'uuid'
import { getByEmail } from '../api-requests/users.js'

const notifyConfig = config.get('notify')

export default async function getToken(email) {
  if (notifyConfig.testToken) {
    const user = await getByEmail(email)
    if (user.isTest) {
      return notifyConfig.testToken
    }
  }
  return uuid()
}
