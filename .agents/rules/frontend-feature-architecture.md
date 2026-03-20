# Frontend Feature Architecture

Directory structure and layering conventions for features and services in the frontend.

## Scope

This applies to all code under `src/server/`.

## Feature Directory Structure

Every feature lives at `src/server/<feature-name>/` and contains exactly these files:

| File            | Purpose                                            |
|-----------------|----------------------------------------------------|
| `index.js`      | Hapi plugin — route registration only              |
| `index.njk`     | Nunjucks template                                  |
| `controller.js` | HTTP request/response — delegates to view model    |
| `view-model.js` | Business logic and downstream service coordination |

## Service Directory Structure

All calls to external systems live as flat files at `src/server/services/<service-name>.js`.

## Dependency Flow

```
controller → view-model → service → repository
```

Pass all calls through the layer chain in order — never skip a layer.

## Framework

- Use Hapi.js exclusively — do not use Express or any other HTTP framework.

## Controller Patterns

- Export controllers as named functions.
- Wrap every handler body in try/catch; log errors with `request.logger`; return a user-friendly error response.
- Delegate all business logic to the view model — keep controllers to HTTP request/response concerns only.

## Example

```javascript
// ✅
export async function myController(request, h) {
  try {
    const viewModel = await myViewModel(request.params)
    return h.view('my-feature/index', viewModel)
  } catch (error) {
    request.logger.error({ err: error }, 'myController failed')
    return h.view('error').code(500)
  }
}
```

## Directory Conventions

- Name directories to reveal their contents at a glance.
- Group features directly under `src/server/`, external integrations under `services/`, shared code under `common/`.
- Keep structure flat by default — add a subdirectory only when grouping multiple cohesive files.
- Match existing patterns unless there is a specific documented reason not to.

## Naming Conventions

| Thing              | Convention                |
|--------------------|---------------------------|
| Directories        | `kebab-case`              |
| Files              | `kebab-case.js`           |
| Controller export  | `<featureName>Controller` |
| View model export  | `<featureName>ViewModel`  |
| Service export     | `<serviceName>Service`    |
| Repository export  | `<serviceName>Repository` |
