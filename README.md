# ai-defra-search-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_ai-defra-search-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_ai-defra-search-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_ai-defra-search-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_ai-defra-search-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_ai-defra-search-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_ai-defra-search-frontend)

Frontend service for the AI DEFRA Search application, providing the user interface for interacting with the AI Assistant.

- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Prerequisites

Run this project from the meta-repo [DEFRA/ai-defra-search-core](https://github.com/DEFRA/ai-defra-search-core).

## Local Setup

> **Note:** You MUST run this project from the meta-repo and access the frontend via the Traefik proxy at `frontend.localhost`. Accessing via `localhost:3000` will break AWS routing for file uploads.

- SQS queue and S3 buckets use [LocalStack](https://localstack.cloud/)
- The CDP uploader uses a stub image that forwards the callback

See the core repo for full configuration details.

## Environment Variables

Copy `.env.example` to `.env` in the project root and replace values as needed. Speak to a team member if you need help with any environment variables.

## Tests

### Running Tests

Tests can be run with Docker or npm directly:

```bash
npm run docker:test
```
```
npm run test
```

## Scanning

[Trivy](https://github.com/aquasecurity/trivy) is used to scan for security vulnerabilities. To run the Trivy scan locally:

```bash
trivy repository --include-dev-deps --format table --exit-code 1 --severity CRITICAL,HIGH,MEDIUM,LOW --ignorefile .trivyignore .
```

## Server-side Caching

We use Catbox for server-side caching. By default, the service will use CatboxRedis when deployed and CatboxMemory for
local development. You can override the default behavior by setting the `SESSION_CACHE_ENGINE` environment variable to
either `redis` or `memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

### Conversation Caching

The application implements conversation caching to provide resilience when the chat API is unavailable. This ensures
users can still see their conversation history even during service disruptions.

**How it works:**

1. **After Successful API Response**: The complete conversation (including the AI's response) is updated in the cache.
2. **On API Failure**: If the chat API returns an error, the application retrieves the cached conversation from Redis
   and displays it to the user, allowing them to see their previous messages.

This approach eliminates the need to call a separate endpoint (`/chat/{conversationId}`) to retrieve conversations on
error, making the error handling more efficient and resilient.

**Automatic Cleanup with TTL:**

Conversations are stored with a Time-To-Live (TTL) that matches the session cache TTL (default: 4 hours). This hybrid
approach provides:

- **Active conversations stay alive**: Each time a user interacts with a conversation (sends a question), the TTL is
  reset, extending the expiry time.
- **Automatic cleanup of stale conversations**: Abandoned conversations are automatically removed by Redis after the TTL
  expires, preventing stale data from accumulating.
- **Manual clearing**: Users can explicitly clear conversations using the "Clear conversation" button, which immediately
  removes the conversation from cache.

The conversation cache is implemented in `src/server/start/conversation-cache.js` and uses the same Redis/Catbox
infrastructure as session caching.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
