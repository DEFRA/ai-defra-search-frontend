import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/tests/**/*.test.js'],
    globals: true,
    environment: 'node',
    timeout: 10000,
    hookTimeout: 10000,
    env: {
      PROTOTYPE_PASSWORD: 'correctpassword',
      API_BASE_URL: 'http://host.docker.internal:3018',
      AUTH_ENABLED: false,
      MS_ENTRA_CLIENT_ID: 'local-dev-client-id',
      MS_ENTRA_CLIENT_SECRET: 'local-dev-tenant-secret',
      MS_ENTRA_REDIRECT_HOST: 'http://localhost:3000',
      MS_ENTRA_TENANT_ID: 'local-dev-tenant-id'
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
