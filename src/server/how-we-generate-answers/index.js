import { howWeGenerateAnswersController } from './controller.js'

/**
 * Sets up the route for the How We Generate Answers page.
 * This route is registered in src/server/router.js.
 */
export const howWeGenerateAnswers = {
  plugin: {
    name: 'how-we-generate-answers',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/how-we-generate-answers',
          ...howWeGenerateAnswersController.get
        }
      ])
    }
  }
}
