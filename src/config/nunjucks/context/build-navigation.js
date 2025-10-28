export function buildNavigation(request) {
    // Base navigation items always shown
  const baseItems = [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'About',
      href: '/about',
      current: request?.path === '/about'
    }
  ]

  // Check if user is authenticated
  let isAuthenticated = false

  try {
    // Check cookie auth
    const cookieAuth = request?.cookieAuth?.get?.()
    if (cookieAuth?.email) {
      isAuthenticated = true
    }

    // Also check yar session as fallback
    if (!isAuthenticated && request?.yar?.get) {
      const sessionEmail = request.yar.get('emailAddress')
      if (sessionEmail?.email || sessionEmail) {
        isAuthenticated = true
      }
    }
  } catch (error) {
    // If there's any error checking auth, assume not authenticated
    isAuthenticated = false
  }

  // Add authenticated-only items if user is logged in
  if (isAuthenticated) {
    baseItems.push(
      {
        text: 'Logout',
        href: '/logout',
        current: request?.path === '/logout'
      }
    )
  } else {
    // Add non-authenticated items if user is not logged in
    baseItems.push(
      {
        text: 'Register',
        href: '/register',
        current: request?.path?.startsWith('/register')
      },
      {
        text: 'Sign in',
        href: '/login',
        current: request?.path === '/login'
      }
    )
  }

  return baseItems
}
