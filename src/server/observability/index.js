import { observabilityController } from './controller.js'

/**
 * Sets up the routes used in the /observability page.
 * These routes are registered in src/server/router.js.
 */
export const observability = {
  plugin: {
    name: 'observability',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/observability',
          handler: observabilityController.handler
        },
        {
          method: 'GET',
          path: '/observability/execution/{executionId}',
          handler: observabilityController.executionDetailHandler
        },
        {
          method: 'GET',
          path: '/observability/metrics/token-usage',
          handler: observabilityController.tokenUsageMetricsHandler
        }
      ])
    }
  }
}
