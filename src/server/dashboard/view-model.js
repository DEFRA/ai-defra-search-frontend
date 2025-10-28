class BaseViewModel {
  constructor() {
    this.pageTitle = 'AI DEFRA Search'
    this.serviceName = 'AI DEFRA Search'
    this.phaseTag = 'Beta'
    this.phaseTagText =
      'This is a new service - your feedback will help us to improve it.'
  }
}

class DashboardViewModel extends BaseViewModel {
  constructor({ userData, tokenUsage, conversationIds, costData }) {
    super()
    this.validateInput({ userData, tokenUsage, conversationIds, costData })
    
    this.pageTitle = 'Dashboard - AI DEFRA Search'
    this.heading = 'Usage Dashboard'
    this.hasData = true
    
    this.userInfo = this.createUserInfo(userData)
    this.overallUsage = this.createOverallUsage(tokenUsage)
    this.usageByModel = tokenUsage.usageByModel || []
    this.totalCosts = this.createTotalCosts(costData)
    this.modelCosts = costData?.modelCosts || []
    this.conversationCosts = costData?.conversationCosts || []
    
    this.usageByModelRows = this.createModelRows()
    this.usageByConversation = this.createConversationData(userData, tokenUsage)
    this.usageByConversationRows = this.createConversationRows()
    this.stats = this.createStats(conversationIds)
  }

  validateInput({ userData, tokenUsage, conversationIds, costData }) {
    if (!userData || typeof userData !== 'object') {
      throw new Error('userData is required and must be an object')
    }
    if (!tokenUsage || typeof tokenUsage !== 'object') {
      throw new Error('tokenUsage is required and must be an object')  
    }
    if (!Array.isArray(conversationIds)) {
      throw new Error('conversationIds must be an array')
    }
  }

  createUserInfo(userData) {
    return {
      email: userData.email,
      firstname: userData.firstname || '',
      lastname: userData.lastname || '',
      project: userData.project || ''
    }
  }

  createOverallUsage(tokenUsage) {
    return tokenUsage.overallUsage || {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0
    }
  }

  createTotalCosts(costData) {
    return costData?.totalCosts || {
      inputCostGbp: 0,
      outputCostGbp: 0,
      totalCostGbp: 0,
      inputCostUsd: 0,
      outputCostUsd: 0,
      totalCostUsd: 0
    }
  }

  createModelRows() {
    return this.modelCosts.map(model => [
      { text: model.modelName || model.model || 'Unknown' },
      { text: this.formatNumber(model.totalInputTokens), format: "numeric" },
      { text: this.formatNumber(model.totalOutputTokens), format: "numeric" },
      { text: this.formatNumber(model.totalTokens), format: "numeric" },
      { text: this.formatCurrency(model.totalCostGbp), format: "numeric" }
    ])
  }

  createConversationData(userData, tokenUsage) {
    const conversations = (tokenUsage.usageByConversation || []).map(conv => {
      const userConv = userData.conversationHistory?.find(
        uc => uc.conversationId === conv.conversationId
      )
      
      return {
        ...conv,
        question: userConv?.question || 'Unknown question',
        createdAt: userConv?.createdAt || null,
        formattedCreatedAt: this.formatDate(userConv?.createdAt),
        modelRows: (conv.models || []).map(model => [
          { text: model.model },
          { text: this.formatNumber(model.totalInputTokens), format: "numeric" },
          { text: this.formatNumber(model.totalOutputTokens), format: "numeric" },
          { text: this.formatNumber(model.totalTokens), format: "numeric" }
        ])
      }
    })

    conversations.sort((a, b) => {
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    return conversations.map(conv => {
      const costConv = this.conversationCosts.find(cc => cc.conversationId === conv.conversationId)
      return {
        ...conv,
        totalCostGbp: costConv?.totalCostGbp || 0,
        modelRows: costConv?.modelCosts?.map(model => [
          { text: model.modelName || model.model || 'Unknown' },
          { text: this.formatNumber(model.totalInputTokens), format: "numeric" },
          { text: this.formatNumber(model.totalOutputTokens), format: "numeric" },
          { text: this.formatNumber(model.totalTokens), format: "numeric" },
          { text: this.formatCurrency(model.totalCostGbp), format: "numeric" }
        ]) || []
      }
    })
  }

  createConversationRows() {
    return this.usageByConversation.map(conv => [
      { text: conv.formattedCreatedAt || 'Unknown date' },
      { text: this.truncateText(conv.question || 'Unknown question', 50) },
      { html: this.createConversationLink(conv.conversationId) },
      { text: this.formatNumber(conv.totalInputTokens), format: "numeric" },
      { text: this.formatNumber(conv.totalOutputTokens), format: "numeric" },
      { text: this.formatNumber(conv.totalTokens), format: "numeric" },
      { text: this.formatCurrency(conv.totalCostGbp), format: "numeric" }
    ])
  }

  createStats(conversationIds) {
    const totalConversations = conversationIds.length
    const hasConversations = totalConversations > 0
    
    return {
      totalConversations,
      totalInputTokens: this.overallUsage.totalInputTokens,
      totalOutputTokens: this.overallUsage.totalOutputTokens,
      totalTokens: this.overallUsage.totalTokens,
      totalCostGbp: this.totalCosts.totalCostGbp,
      totalCostUsd: this.totalCosts.totalCostUsd,
      totalCostGbpFormatted: (this.totalCosts.totalCostGbp || 0).toFixed(4),
      averageTokensPerConversation: hasConversations 
        ? Math.round(this.overallUsage.totalTokens / totalConversations)
        : 0,
      averageCostPerConversation: hasConversations 
        ? this.totalCosts.totalCostGbp / totalConversations
        : 0,
      averageCostPerConversationFormatted: hasConversations && this.totalCosts.totalCostGbp
        ? (this.totalCosts.totalCostGbp / totalConversations).toFixed(4)
        : '0.0000'
    }
  }

  formatNumber(value) {
    return (value || 0).toString()
  }

  formatCurrency(value, decimals = 4) {
    return `£${(value || 0).toFixed(decimals)}`
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown date'
    
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  createConversationLink(conversationId) {
    if (!conversationId) return 'N/A'
    const shortId = conversationId.substring(0, 12)
    return `<a href="/chat/${conversationId}" class="govuk-link">${shortId}...</a>`
  }

  static createNoLoginView() {
    return this.createBaseErrorView({
      error: 'Please log in to view your dashboard',
      hasData: false
    })
  }

  static createNoConversationsView() {
    return this.createBaseErrorView({
      message: 'No conversation history found. Start a conversation to see your usage statistics.',
      hasData: false
    })
  }

  static createTokenUsageErrorView(userData, conversationIds) {
    const baseView = this.createBaseErrorView({
      heading: 'Usage Dashboard',
      hasData: true,
      error: 'Token usage data is currently unavailable. Your conversation history is shown below.'
    })

    return {
      ...baseView,
      userInfo: {
        email: userData.email,
        firstname: userData.firstname || '',
        lastname: userData.lastname || '',
        project: userData.project || ''
      },
      conversationHistory: userData.conversationHistory.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ),
      ...this.createEmptyUsageData(conversationIds.length)
    }
  }

  static createGeneralErrorView() {
    return this.createBaseErrorView({
      error: 'Sorry, there was an error loading your dashboard. Please try again.',
      hasData: false
    })
  }

  static createBaseErrorView(overrides = {}) {
    const baseViewModel = new BaseViewModel()
    return {
      ...baseViewModel,
      pageTitle: 'Dashboard - AI DEFRA Search',
      heading: 'Dashboard',
      hasData: false,
      ...overrides
    }
  }

  static createEmptyUsageData(totalConversations = 0) {
    return {
      stats: {
        totalConversations,
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
      usageByConversationRows: []
    }
  }
}

export { DashboardViewModel }
