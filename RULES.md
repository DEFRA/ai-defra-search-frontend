# Rules

# SCSS Development Rules

## Core Principle

Maximize style reuse. Minimize new styles.

## Class Naming

- Custom classes: prefix with `app-`

## Styling Priority (Follow in Order)

1. **Reuse existing app styles** - Always check first. Prefer consistency over perfect design match.
2. **Use GOV.UK Design System** - Search `node_modules/govuk-frontend` for applicable styles.
3. **Never create new styles** - ONLY as last resort. Requires user approval. Must use `app-` prefix.

## Rules

- Never rewrite or duplicate existing styles
- Add new styles only when absolutely necessary
- Seek explicit approval before creating any new `app-` classes
- Always extract and reuse hardcoded variables (e.g. colours & dimensions)
