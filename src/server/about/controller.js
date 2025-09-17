/**
 * About page controller for AI DEFRA Search service.
 * Provides information about the service, its purpose, and how it works.
 */
export const aboutController = {
  handler(_request, h) {
    return h.view('about/index', {
      pageTitle: 'About this service - AI DEFRA Search',
      heading: 'About this service',
      serviceName: 'AI DEFRA Search',
      phaseTag: 'Beta',
      breadcrumbs: [
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'About this service'
        }
      ]
    })
  }
}
