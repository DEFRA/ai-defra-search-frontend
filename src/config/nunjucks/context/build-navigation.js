export function buildNavigation (request) {
  return [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'Upload',
      href: '/upload',
      current: request?.path === '/upload'
    },
    {
      text: 'About',
      href: '/about',
      current: request?.path === '/about'
    }
  ]
}
