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
      return h.view('dashboard/dashboard', DashboardViewModel.createNoLoginView())
    }

    const userData = await getByEmail(emailAddress.email, true)
    
    if (!userData || !userData.conversationHistory || userData.conversationHistory.length === 0) {
      logger.info('No conversation history found for user')
      return h.view('dashboard/dashboard', DashboardViewModel.createNoConversationsView())
    }

    const conversationIds = userData.conversationHistory.map(conv => conv.conversationId)
    logger.info(`Found ${conversationIds.length} conversations for user`)

    let tokenUsage
    try {
      tokenUsage = await conversationHistoryService.getTokenUsage(conversationIds)
    } catch (tokenError) {
      logger.error('Failed to fetch token usage, showing partial dashboard:', tokenError)
      
      return h.view('dashboard/dashboard', DashboardViewModel.createTokenUsageErrorView(userData, conversationIds))
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
    
    return h.view('dashboard/dashboard', DashboardViewModel.createGeneralErrorView())
  }
}

export { getDashboard }
