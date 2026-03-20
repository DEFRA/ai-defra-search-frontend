# JavaScript Code Style

Code style conventions for all JavaScript source files in the frontend service.

## Scope

This applies to all files in `src/`.

## Language

- Write all source files in vanilla JavaScript — no TypeScript. Use JSDoc comments for type annotations.
- Use ES Modules: `export const foo = ...` and `import { foo } from '...'`, not `module.exports` or `require`.
- Use named exports only — never default exports.
- Use the `~` alias for internal project imports: `import { foo } from '~/src/server/common/...'`.

## Constants

- Extract all magic strings, numbers, and URLs to named constants — never hardcode values inline.
- Place module-level constants at the top of the file, before any function definitions.
- Place constants shared across files in `src/server/common/constants/`.
- Name constants in `SCREAMING_SNAKE_CASE`.

## Example

```javascript
// ✅
const STATUS_PUBLISHED = 'published'
if (status === STATUS_PUBLISHED) { ... }

// ❌
if (status === 'published') { ... }  // magic string
```

## HTTP Calls

- Use native `fetch` for all API calls.

## Nunjucks Templates

- Split templates into logical sections using `{% include %}` or `{% block %}`.
- Extract any section longer than ~30 lines into a partial.
- Place partials in `src/server/common/templates/partials/`.
- Place feature-specific includes alongside the feature template at `src/server/features/<name>/`.
- Back every template that requires data with a `view-model.js` — the view model is the sole source of data for the template.
- Keep all logic out of `.njk` files.
- Define all view model properties with JSDoc, including types for every field.

## Example

```javascript
/**
 * @param {Object} params
 * @param {string} params.title
 * @param {boolean} params.isActive
 */
export class MyViewModel {
  constructor({ title, isActive }) {
    this.title = title
    this.isActive = isActive
  }
}
```
