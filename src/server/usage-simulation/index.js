import { usageSimulationController } from './controller.js'

export const usageSimulation = {
  plugin: {
    name: 'usageSimulation',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/simulate-usage',
          handler: usageSimulationController.get
        },
        {
          method: 'POST',
          path: '/simulate-usage',
          handler: usageSimulationController.post
        }
      ])
    }
  }
}
