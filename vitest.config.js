import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/tests/**/*.test.js'],
    globals: true,
    environment: 'node',
    timeout: 10000,
    hookTimeout: 10000,
    env: {
      PROTOTYPE_PASSWORD: 'correctpassword'
    },
    coverage: {
      reportOnFailure: true,
      clean: false,
      reporter: ['lcov'],
      include: ['src/**/*.js'],
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '.server',
        'src/index.js'
      ]
    }
  }
})
