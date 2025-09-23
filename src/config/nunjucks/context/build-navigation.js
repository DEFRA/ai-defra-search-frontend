export function buildNavigation(request) {
  return [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'About',
      href: '/about',
      current: request?.path === '/about'
    },
    {
      text: 'Observability',
      href: '/observability',
      current: request?.path === '/observability'
    },
    {
      text: 'AI Model Usage Simulation',
      href: '/simulate-usage',
      current: request?.path === '/simulate-usage'
    }
  ]
}
