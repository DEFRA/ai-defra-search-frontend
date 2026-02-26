import { buildNavigation } from '../../../../../src/config/nunjucks/context/build-navigation.js'

function mockRequest (options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'Upload',
        href: '/upload'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      {
        current: true,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'Upload',
        href: '/upload'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })

  test('Should highlight Upload when on upload path', () => {
    expect(buildNavigation(mockRequest({ path: '/upload' }))).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: true,
        text: 'Upload',
        href: '/upload'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })
})
