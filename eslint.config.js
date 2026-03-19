import globals from 'globals'
import neostandard from 'neostandard'

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore()],
    noJsx: true
  }),
  {
    files: ['src/client/**/*.js'],
    languageOptions: {
      globals: globals.browser
    }
  }
]
