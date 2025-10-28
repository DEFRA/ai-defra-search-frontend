import { describe, test, expect } from 'vitest'
import {
  registerGetController,
  registerSuccessController
} from './controller.js'

describe('#registerGetController', () => {
  test('Should provide expected response', async () => {
    const mockRequest = {}
    const mockH = {
      view: (viewName, context) => ({ viewName, context })
    }

    const response = await registerGetController.handler(mockRequest, mockH)

    expect(response).toEqual({
      viewName: 'register/index',
      context: {
        pageTitle: 'Register for AI Self Service',
        heading: 'Register for AI Self Service',
        breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Register' }]
      }
    })
  })
})

describe('#registerSuccessController', () => {
  test('Should provide expected response', async () => {
    const mockRequest = {}
    const mockH = {
      view: (viewName, context) => ({ viewName, context })
    }

    const response = await registerSuccessController.handler(mockRequest, mockH)

    expect(response).toEqual({
      viewName: 'register/success',
      context: {
        pageTitle: 'Registration successful',
        heading: 'Registration successful',
        breadcrumbs: [
          { text: 'Home', href: '/' },
          { text: 'Register', href: '/register' },
          { text: 'Success' }
        ]
      }
    })
  })
})
