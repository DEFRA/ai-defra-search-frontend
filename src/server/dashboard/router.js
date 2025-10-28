import * as dashboardController from '../dashboard/controller.js'

export const dashboard = {
  plugin: {
    name: 'dashboard',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard',
          async handler(request, h) {
            return await dashboardController.getDashboard(request, h)
          }
        }
      ])
    }
  }
}
