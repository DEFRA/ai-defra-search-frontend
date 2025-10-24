import { config } from '../../config/config.js'

export const howWeGenerateAnswersController = {
  get: {
    handler(_request, h) {
      return h.view('how-we-generate-answers/index', {
        pageTitle: 'How We Generate Answers - AI DEFRA Search',
        heading: 'How We Generate Answers',
        
        phaseTag: 'Beta',
        phaseTagText:
          'This is a new service – your feedback will help us to improve it.'
      })
    }
  }
}
