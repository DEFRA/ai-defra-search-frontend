// Handles AI Model Usage Simulation form and results
import { simulateUsage } from '../api-requests/usage-simulation.js'

export const usageSimulationController = {
  async get(request, h) {
    return h.view('usage-simulation/index', { form: {}, result: null })
  },
  async post(request, h) {
    const form = request.payload
    try {
      const result = await simulateUsage(form)
      return h.view('usage-simulation/index', { form, result })
    } catch (error) {
      return h.view('usage-simulation/index', {
        form,
        result: null,
        error: error.message
      })
    }
  }
}
