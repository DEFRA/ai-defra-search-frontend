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
    this.pageTitle = 'Dashboard - AI DEFRA Search'
    this.heading = 'Usage Dashboard'
    this.hasData = true
    
    this.userInfo = {
      email: userData.email,
      firstname: userData.firstname || '',
      lastname: userData.lastname || '',
      project: userData.project || ''
    }
    
    this.overallUsage = tokenUsage.overallUsage || {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0
    }
    
    this.usageByModel = tokenUsage.usageByModel || []
    
    // Cost data
    this.totalCosts = costData?.totalCosts || {
      inputCostGbp: 0,
      outputCostGbp: 0,
      totalCostGbp: 0,
      inputCostUsd: 0,
      outputCostUsd: 0,
      totalCostUsd: 0
    }
    
    this.modelCosts = costData?.modelCosts || []
    this.conversationCosts = costData?.conversationCosts || []
    
    // Prepare table rows with cost data for usage by model
    this.usageByModelRows = this.modelCosts.map(model => [
      { text: model.modelName || model.model || 'Unknown' },
      { text: (model.totalInputTokens || 0).toString(), format: "numeric" },
      { text: (model.totalOutputTokens || 0).toString(), format: "numeric" },
      { text: (model.totalTokens || 0).toString(), format: "numeric" },
      { text: `£${(model.totalCostGbp || 0).toFixed(4)}`, format: "numeric" }
    ])
    
    this.usageByConversation = (tokenUsage.usageByConversation || []).map(conv => {
      const userConv = userData.conversationHistory?.find(
        uc => uc.conversationId === conv.conversationId
      )
      
      return {
        ...conv,
        question: userConv?.question || 'Unknown question',
        createdAt: userConv?.createdAt || null,
        formattedCreatedAt: userConv?.createdAt 
          ? new Date(userConv.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Unknown date',
        modelRows: (conv.models || []).map(model => [
          { text: model.model },
          { text: model.totalInputTokens.toString(), format: "numeric" },
          { text: model.totalOutputTokens.toString(), format: "numeric" },
          { text: model.totalTokens.toString(), format: "numeric" }
        ])
      }
    })
    
    this.usageByConversation.sort((a, b) => {
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    
    // Update conversation data with cost information
    this.usageByConversation = this.usageByConversation.map(conv => {
      const costConv = this.conversationCosts.find(cc => cc.conversationId === conv.conversationId)
      return {
        ...conv,
        totalCostGbp: costConv?.totalCostGbp || 0,
        modelRows: costConv?.modelCosts?.map(model => [
          { text: model.modelName || model.model || 'Unknown' },
          { text: (model.totalInputTokens || 0).toString(), format: "numeric" },
          { text: (model.totalOutputTokens || 0).toString(), format: "numeric" },
          { text: (model.totalTokens || 0).toString(), format: "numeric" },
          { text: `£${(model.totalCostGbp || 0).toFixed(4)}`, format: "numeric" }
        ]) || []
      }
    })
    
    // Prepare table rows for usageByConversation with costs
    this.usageByConversationRows = this.usageByConversation.map(conv => [
      { text: conv.formattedCreatedAt || 'Unknown date' },
      { text: conv.question && conv.question.length > 50 ? conv.question.substring(0, 50) + '...' : (conv.question || 'Unknown question') },
      { html: `<a href="/chat/${conv.conversationId}" class="govuk-link">${(conv.conversationId || '').substring(0, 12)}...</a>` },
      { text: (conv.totalInputTokens || 0).toString(), format: "numeric" },
      { text: (conv.totalOutputTokens || 0).toString(), format: "numeric" },
      { text: (conv.totalTokens || 0).toString(), format: "numeric" },
      { text: `£${(conv.totalCostGbp || 0).toFixed(4)}`, format: "numeric" }
    ])
    
    this.stats = {
      totalConversations: conversationIds.length,
      totalInputTokens: this.overallUsage.totalInputTokens,
      totalOutputTokens: this.overallUsage.totalOutputTokens,
      totalTokens: this.overallUsage.totalTokens,
      totalCostGbp: this.totalCosts.totalCostGbp,
      totalCostUsd: this.totalCosts.totalCostUsd,
      totalCostGbpFormatted: (this.totalCosts.totalCostGbp || 0).toFixed(4),
      averageTokensPerConversation: conversationIds.length > 0 
        ? Math.round(this.overallUsage.totalTokens / conversationIds.length)
        : 0,
      averageCostPerConversation: conversationIds.length > 0 
        ? this.totalCosts.totalCostGbp / conversationIds.length
        : 0,
      averageCostPerConversationFormatted: conversationIds.length > 0 && this.totalCosts.totalCostGbp
        ? (this.totalCosts.totalCostGbp / conversationIds.length).toFixed(4)
        : '0.0000'
    }
  }
}

export { DashboardViewModel }
