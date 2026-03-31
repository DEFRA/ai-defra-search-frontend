# Naming

Naming conventions for all JavaScript identifiers in the frontend service.

## Scope

This applies to all files in `src/`: functions, variables, constants, directories, and module exports.

## Directories

- Use domain-specific nouns describing what the directory contains: `authentication/`, `user-notifications/`, `prompt-cards/`.
- Treat `utils/`, `helpers/`, `shared/`, `common/`, and `lib/` as signals to find a more specific name.

## Functions

- Use verb phrases: `validateCredentials()`, `calculateTax()`, `sendNotification()`.
- Prefix boolean-returning functions with `is`, `has`, `can`, or `should`: `isAuthenticated()`, `hasPermission()`.
- Use verbs that signal async intent when not obvious from context: `fetchUserData()`, `loadConfiguration()`.

## Variables and Constants

- Prefix boolean variables with `is`, `has`, `can`, or `should`: `isLoading`, `hasError`.
- Name constants in `SCREAMING_SNAKE_CASE` describing what they represent, not their value: `MAX_RETRY_ATTEMPTS` not `THREE`.

## Modules

- Name each module to match its primary export: `user-validator.js` exports `userValidator`.
- Use consistent verb patterns within a domain: if you have `createUser()`, use `createOrder()` not `makeOrder()`.

## Errors

- Include `Error` in all error class and variable names: `ValidationError`, `NotFoundError`, `upstreamError`.

## Example

```javascript
// ✅
const MAX_LOGIN_ATTEMPTS = 5
const isAuthenticated = checkSession(request)
async function fetchUserProfile(userId) { ... }

// ❌
const n = 5                    // reveals nothing
const authenticated = true     // missing boolean prefix
async function user(id) { ... } // not a verb phrase
```
