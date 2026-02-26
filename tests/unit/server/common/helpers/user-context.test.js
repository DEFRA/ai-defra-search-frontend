import { describe, test, expect } from 'vitest'

import { getUserId, run } from '../../../../../src/server/common/helpers/user-context.js'

describe('user-context', () => {
  describe('getUserId', () => {
    test('returns null when called outside a request context', () => {
      expect(getUserId()).toBeNull()
    })

    test('returns null when the context is active but no userId has been set', () => {
      run(null, () => {
        expect(getUserId()).toBeNull()
      })
    })

    test('returns the userId stored in the current async context', () => {
      run('test-user-oid', () => {
        expect(getUserId()).toBe('test-user-oid')
      })
    })
  })
})
