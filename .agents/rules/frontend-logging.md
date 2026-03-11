# Frontend Logging

Structured logging conventions for server-side code using the Pino logger provided via hapi-pino.

## Scope

This applies to all server-side code in `src/server/`. Client-side code does not use this logger.

## Logger Access

- Use `request.logger` for request-scoped logging inside route handlers.
- Create one module-level logger instance per module using `server.logger` or a child derived from it — never inside loops or frequently called functions.

## Security

- Exclude bearer tokens, API keys, passwords, and authentication headers from all log entries.
- Exclude PII (email addresses, national IDs, payment data, phone numbers) from all log entries.
- Exclude database connection strings, credentials, and full request/response bodies from all log entries.

## Message Structure

- Pass data as a structured object before the message string: `logger.info({ userId }, 'User fetched')`.
- Pass `Error` objects as `{ err: error }` to preserve the full stack trace.
- Include correlation IDs (request ID, trace ID) in every log entry.

## Log Levels

| Level   | When to use                                            |
|---------|--------------------------------------------------------|
| `info`  | Successful requests, significant state transitions     |
| `warn`  | Failed auth/authorisation attempts, recoverable errors |
| `error` | Unexpected failures — always include `{ err: error }`  |
| `debug` | External API call details, business logic decisions    |

- Guard expensive `debug` log values with `logger.isLevelEnabled('debug')` before computing them.

## External API Calls

- Log initiation, response status, and duration for every external API call.
- Log only method, status code, and duration — exclude request and response payloads.

## Example

```javascript
// ✅
request.logger.info({ method: req.method, statusCode: res.statusCode }, 'Request completed')
request.logger.error({ err: error, service: 'search-api' }, 'API call failed')

// ❌
logger.info(`Token: ${bearerToken}`)        // sensitive data
logger.error({ error: error.toString() })   // loses stack trace
```
