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
      DATA_API_URL: 'http://localhost:8085',
      KNOWLEDGE_API_URL: 'http://localhost:9999',
      AUTH_ENABLED: 'false',
      MS_ENTRA_CLIENT_ID: '28434819-c64a-4b95-bb23-0f6202bcfc02',
      MS_ENTRA_TENANT_ID: 'cb2d380f-8056-494b-bfad-cfcaf767c0b3',
      MS_ENTRA_CLIENT_SECRET: 'test-client-secret',
      MS_ENTRA_REDIRECT_HOST: 'http://localhost:3000'
    },
    coverage: {
      reportOnFailure: true,
      clean: false,
      reporter: ['text', 'text-summary', 'lcov'],
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
