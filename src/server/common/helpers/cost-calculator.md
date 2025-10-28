# Cost Calculator Module

This module provides utilities for calculating costs associated with AI model token usage.

## Features

- **Token cost calculations** based on model-specific pricing
- **Multi-currency support** with USD to GBP conversion
- **Granular breakdowns** by model and conversation
- **Comprehensive cost aggregation** across all usage

## Functions

### `calculateTokenCost(modelId, inputTokens, outputTokens)`
Calculates cost for a specific model's token usage.

**Parameters:**
- `modelId` (string): Model identifier matching model-costs.js
- `inputTokens` (number): Number of input tokens
- `outputTokens` (number): Number of output tokens

**Returns:** Object with cost breakdown in USD and GBP

### `calculateTotalCosts(tokenUsage)`
Aggregates costs across all models and conversations.

**Parameters:**
- `tokenUsage` (object): Token usage data from API

**Returns:** Object with total costs and detailed breakdowns

### `convertUsdToGbp(usdAmount)`
Converts USD amounts to GBP using current exchange rate.

### `getExchangeRate()`
Returns the current USD to GBP exchange rate.

## Usage

```javascript
import { calculateTotalCosts, calculateTokenCost } from '../common/helpers/cost-calculator.js'

// Calculate costs for token usage data
const costData = calculateTotalCosts(tokenUsage)

// Calculate cost for specific model
const cost = calculateTokenCost('eu.anthropic.claude-3-haiku-20240307-v1:0', 1000, 500)
```

## Configuration

- Exchange rate is defined as a constant (currently 0.81)
- Model pricing is imported from `model-costs.js`
- Costs are calculated per 1000 tokens as specified in model configuration