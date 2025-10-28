import { modelCosts } from '../constants/model-costs.js'
import { createLogger } from './logging/logger.js'

const logger = createLogger('cost-calculator')

// Approximate USD to GBP exchange rate (should be updated periodically)
const USD_TO_GBP_RATE = 0.81

/**
 * Convert USD to GBP
 * @param {number} usdAmount - Amount in USD
 * @returns {number} Amount in GBP
 */
export function convertUsdToGbp(usdAmount) {
  return usdAmount * USD_TO_GBP_RATE
}

/**
 * Calculate cost for tokens based on model pricing
 * @param {string} modelId - The model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {object} Cost breakdown in both USD and GBP
 */
export function calculateTokenCost(modelId, inputTokens, outputTokens) {
  const modelConfig = modelCosts[modelId]
  
  if (!modelConfig) {
    logger.warn(`Model cost configuration not found for: ${modelId}`)
    return {
      inputCostUsd: 0,
      outputCostUsd: 0,
      totalCostUsd: 0,
      inputCostGbp: 0,
      outputCostGbp: 0,
      totalCostGbp: 0,
      modelName: modelId
    }
  }
  
  // Calculate costs in USD
  const inputCostUsd = (inputTokens / modelConfig.inputTokens.perTokens) * modelConfig.inputTokens.cost
  const outputCostUsd = (outputTokens / modelConfig.outputTokens.perTokens) * modelConfig.outputTokens.cost
  const totalCostUsd = inputCostUsd + outputCostUsd
  
  // Convert to GBP
  const inputCostGbp = convertUsdToGbp(inputCostUsd)
  const outputCostGbp = convertUsdToGbp(outputCostUsd)
  const totalCostGbp = convertUsdToGbp(totalCostUsd)
  
  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    inputCostGbp,
    outputCostGbp,
    totalCostGbp,
    modelName: modelConfig.name
  }
}

/**
 * Calculate total costs across all usage
 * @param {object} tokenUsage - Token usage data from API
 * @returns {object} Total cost breakdown with model and conversation costs
 */
export function calculateTotalCosts(tokenUsage) {
  let totalInputCostGbp = 0
  let totalOutputCostGbp = 0
  let totalCostGbp = 0
  let totalInputCostUsd = 0
  let totalOutputCostUsd = 0
  let totalCostUsd = 0
  
  const modelCosts = []
  const conversationCosts = []
  
  // Calculate costs by model
  if (tokenUsage.usageByModel) {
    tokenUsage.usageByModel.forEach(modelUsage => {
      const costs = calculateTokenCost(
        modelUsage.model, 
        modelUsage.totalInputTokens, 
        modelUsage.totalOutputTokens
      )
      
      totalInputCostGbp += costs.inputCostGbp
      totalOutputCostGbp += costs.outputCostGbp
      totalCostGbp += costs.totalCostGbp
      totalInputCostUsd += costs.inputCostUsd
      totalOutputCostUsd += costs.outputCostUsd
      totalCostUsd += costs.totalCostUsd
      
      modelCosts.push({
        ...modelUsage,
        ...costs
      })
    })
  }
  
  // Calculate costs by conversation
  if (tokenUsage.usageByConversation) {
    tokenUsage.usageByConversation.forEach(convUsage => {
      let convInputCostGbp = 0
      let convOutputCostGbp = 0
      let convTotalCostGbp = 0
      let convInputCostUsd = 0
      let convOutputCostUsd = 0
      let convTotalCostUsd = 0
      
      const convModelCosts = []
      
      if (convUsage.models) {
        convUsage.models.forEach(modelUsage => {
          const costs = calculateTokenCost(
            modelUsage.model,
            modelUsage.totalInputTokens,
            modelUsage.totalOutputTokens
          )
          
          convInputCostGbp += costs.inputCostGbp
          convOutputCostGbp += costs.outputCostGbp
          convTotalCostGbp += costs.totalCostGbp
          convInputCostUsd += costs.inputCostUsd
          convOutputCostUsd += costs.outputCostUsd
          convTotalCostUsd += costs.totalCostUsd
          
          convModelCosts.push({
            ...modelUsage,
            ...costs
          })
        })
      }
      
      conversationCosts.push({
        ...convUsage,
        inputCostGbp: convInputCostGbp,
        outputCostGbp: convOutputCostGbp,
        totalCostGbp: convTotalCostGbp,
        inputCostUsd: convInputCostUsd,
        outputCostUsd: convOutputCostUsd,
        totalCostUsd: convTotalCostUsd,
        modelCosts: convModelCosts
      })
    })
  }
  
  return {
    totalCosts: {
      inputCostGbp: totalInputCostGbp,
      outputCostGbp: totalOutputCostGbp,
      totalCostGbp,
      inputCostUsd: totalInputCostUsd,
      outputCostUsd: totalOutputCostUsd,
      totalCostUsd
    },
    modelCosts,
    conversationCosts
  }
}

/**
 * Get the current USD to GBP exchange rate
 * @returns {number} Current exchange rate
 */
export function getExchangeRate() {
  return USD_TO_GBP_RATE
}