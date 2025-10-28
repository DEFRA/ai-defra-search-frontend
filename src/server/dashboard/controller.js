import { conversationHistoryService } from '../api-requests/conversation-history-service.js'
import { getByEmail } from '../api-requests/users.js'
import { getEmailAddress } from '../session/index.js'
import { DashboardViewModel } from './view-model.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { calculateTotalCosts } from '../common/helpers/cost-calculator.js'

const logger = createLogger('dashboard-controller')

async function getDashboard(request, h) {
  logger.info('Loading dashboard')

  try {
    const emailAddress = getEmailAddress(request)
    
    if (!emailAddress || !emailAddress.email) {
      logger.warn('No email address found in session')
      return h.view('dashboard/dashboard', {
        pageTitle: 'Dashboard - AI DEFRA Search',
        heading: 'Dashboard',
        error: 'Please log in to view your dashboard',
        hasData: false,
        phaseTag: 'Beta',
        phaseTagText: 'This is a new service - your feedback will help us to improve it.'
      })
    }

    const userData = await getByEmail(emailAddress.email, true)
    
    if (!userData || !userData.conversationHistory || userData.conversationHistory.length === 0) {
      logger.info('No conversation history found for user')
      return h.view('dashboard/dashboard', {
        pageTitle: 'Dashboard - AI DEFRA Search',
        heading: 'Dashboard',
        message: 'No conversation history found. Start a conversation to see your usage statistics.',
        hasData: false,
        phaseTag: 'Beta',
        phaseTagText: 'This is a new service - your feedback will help us to improve it.'
      })
    }

    const conversationIds = userData.conversationHistory.map(conv => conv.conversationId)
    logger.info(`Found ${conversationIds.length} conversations for user`)

    let tokenUsage
    try {
      tokenUsage = await conversationHistoryService.getTokenUsage(conversationIds)
    } catch (tokenError) {
      logger.error('Failed to fetch token usage, showing partial dashboard:', tokenError)
      
      return h.view('dashboard/dashboard', {
        pageTitle: 'Dashboard - AI DEFRA Search',
        heading: 'Usage Dashboard',
        hasData: true,
        userInfo: {
          email: userData.email,
          firstname: userData.firstname || '',
          lastname: userData.lastname || '',
          project: userData.project || ''
        },
        conversationHistory: userData.conversationHistory.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ),
        stats: {
          totalConversations: conversationIds.length,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          totalCostGbp: 0,
          totalCostUsd: 0,
          totalCostGbpFormatted: '0.0000',
          averageTokensPerConversation: 0,
          averageCostPerConversation: 0,
          averageCostPerConversationFormatted: '0.0000'
        },
        overallUsage: {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0
        },
        usageByModel: [],
        usageByModelRows: [],
        usageByConversation: [],
        usageByConversationRows: [],
        phaseTag: 'Beta',
        phaseTagText: 'This is a new service - your feedback will help us to improve it.',
        error: 'Token usage data is currently unavailable. Your conversation history is shown below.'
      })
    }
    
    const costData = calculateTotalCosts(tokenUsage)
    logger.info(`Calculated total cost: £${costData.totalCosts.totalCostGbp.toFixed(4)}`)
    
    const viewModel = new DashboardViewModel({
      userData,
      tokenUsage,
      conversationIds,
      costData
    })

    logger.info('Dashboard data successfully prepared')
    return h.view('dashboard/dashboard', viewModel)

  } catch (error) {
    logger.error('Error loading dashboard:', error)
    
    return h.view('dashboard/dashboard', {
      pageTitle: 'Dashboard - AI DEFRA Search',
      heading: 'Dashboard',
      error: 'Sorry, there was an error loading your dashboard. Please try again.',
      hasData: false,
      phaseTag: 'Beta',
      phaseTagText: 'This is a new service - your feedback will help us to improve it.'
    })
  }
}

export { getDashboard }
