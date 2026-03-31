# Frontend Configuration

Configuration conventions for the frontend service using Convict.

## Scope

This applies to all files in `src/config/`: schema definitions, environment JSON files, and any code that reads configuration values.

## File Structure

```
config/
├── config.js          # Schema definition and validation
├── development.json   # Development defaults
├── test.json          # Test defaults
└── production.json    # Production overrides (no default values)
```

Load environment-specific files via: `config.loadFile('./config/' + config.get('env') + '.json')`

## Schema Definition

- Declare every schema property with `default: null` and a matching `env` property.
- Add a `doc` description to every configuration field.
- Group related properties using nested schema objects.
- Use Convict's built-in formats (`port`, `url`, `email`, `ipaddress`) where applicable.
- Add a custom `format` validation function when additional validation is required.

## Startup Validation

- Call `config.validate({ allowed: 'strict' })` immediately after schema definition, before any config value is read.
- Throw on any validation failure — never swallow config errors silently.
- Log all configuration key names (never their values) on successful validation.

## Defaults Policy

- Set defaults only in environment-specific JSON files (`development.json`, `test.json`).
- Leave `production.json` with no default values — all production config must come from real environment variables.
- Keep the schema definition free of hardcoded default values.

## Environment Variables

- Name all environment variables in `SCREAMING_SNAKE_CASE`.
- Source all URLs, credentials, and external addresses from config — never inline them in code.
