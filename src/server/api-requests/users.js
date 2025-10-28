import { createLogger } from '../common/helpers/logging/logger.js'
import { config } from '../../config/config.js'

const logger = createLogger()

const getByEmail = async (email, full = false) => {
  logger.info('Fetching user by email from API')

  try {
    const backendApiUrl = config.get('backendApiUrl')
    const url = `${backendApiUrl}/users?emailaddress=${encodeURIComponent(email)}`

    logger.info(`Making API request to: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      logger.error(`API request failed with status: ${response.status}`)
      return {}
    }

    const data = await response.json()

    if (data.message === 'User found' && data.user) {
      logger.info('Successfully retrieved user data from API')

      if (full) {
        return {
          email: data.user.emailaddress,
          firstname: data.user.firstname,
          lastname: data.user.lastname,
          project: data.user.project,
          conversationHistory: data.user.conversationHistory || [],
        }
      } else {
        return { email: data.user.emailaddress }
      }
    } else {
      logger.error(`User not found or invalid response for email: ${email}`)
      return {}
    }
  } catch (error) {
    logger.error(`Error fetching user data: ${error.message}`)
    return {}
  }
}

const registerUser = async (userDetails) => {
  logger.info('Registering new user via API')

  try {
    const { emailaddress, firstname, lastname, project } = userDetails

    if (!emailaddress || !firstname || !lastname || !project) {
      logger.error('Missing required fields for user registration')
      return {
        error:
          'Missing required fields: emailaddress, firstname, lastname, project'
      }
    }

    const backendApiUrl = config.get('backendApiUrl')
    const url = `${backendApiUrl}/users/register`

    const payload = {
      emailaddress,
      firstname,
      lastname,
      project
    }

    logger.info(`Making POST request to: ${url}`)
    logger.info(`Payload: ${JSON.stringify(payload)}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      logger.error(`User registration failed with status: ${response.status}`)
      const errorText = await response.text()
      logger.error(`Error response: ${errorText}`)
      return { error: `Registration failed with status ${response.status}` }
    }

    const data = await response.json()

    if (data.message === 'User registered successfully' && data.user) {
      logger.info('Successfully registered user via API')

      return {
        success: true,
        message: data.message,
        user: {
          emailaddress: data.user.emailaddress,
          firstname: data.user.firstname,
          lastname: data.user.lastname,
          project: data.user.project,
          active: data.user.active,
          conversationHistory: data.user.conversationHistory || [],
          createdAt: data.user.createdAt,
          updatedAt: data.user.updatedAt
        }
      }
    } else {
      logger.error(
        `Invalid response format for user registration: ${JSON.stringify(data)}`
      )
      return { error: 'Invalid response format from registration API' }
    }
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`)
    return { error: `Registration failed: ${error.message}` }
  }
}

const addConversationHistory = async (conversationData) => {
  logger.info('Adding user conversation history via API')

  try {
    const { emailaddress, conversationId, question } = conversationData

    if (!emailaddress || !conversationId || !question) {
      logger.error('Missing required fields for conversation history')
      return {
        error: 'Missing required fields: emailaddress, conversationId, question'
      }
    }

    const backendApiUrl = config.get('backendApiUrl')
    const url = `${backendApiUrl}/users/conversation/history`

    const payload = {
      emailaddress,
      conversationId,
      question
    }

    logger.info(`Making POST request to: ${url}`)
    logger.info(`Payload: ${JSON.stringify(payload)}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      logger.error(`Conversation history request failed with status: ${response.status}`)
      const errorText = await response.text()
      logger.error(`Error response: ${errorText}`)
      return { error: `Request failed with status ${response.status}` }
    }

    const data = await response.json()

    logger.info('Successfully added conversation history via API')
    return {
      success: true,
      data
    }
  } catch (error) {
    logger.error(`Error adding conversation history: ${error.message}`)
    return { error: `Request failed: ${error.message}` }
  }
}

export { getByEmail, registerUser, addConversationHistory }
