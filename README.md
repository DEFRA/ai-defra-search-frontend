# ai-defra-search-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_ai-defra-search-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_ai-defra-search-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_ai-defra-search-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_ai-defra-search-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_ai-defra-search-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_ai-defra-search-frontend)

Frontend service for the AI DEFRA Search application. This service provides the user interface for users to interact with the AI Assistant.

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
  - [Building the Docker Image](#building-the-docker-image)
  - [Starting the Docker Container](#starting-the-docker-container)
- [Tests](#tests)
- [Security Scanning](#security-scanning)
  - [Trivy Vulnerability Scan](#trivy-vulnerability-scan)
- [Server-side Caching](#server-side-caching)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Prerequisites

- Docker
- Docker Compose

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/DEFRA/ai-defra-search-frontend.git
cd ai-defra-search-frontend
npm install
```

## Environment Variables

Create a `.env` file in the root of the project from the example template:

```bash
cp .example.env .env
```

Update the values in `.env` as needed for your local environment.

The following environment variables can be configured for the application:

| Variable | Required | Default | Description                                                              |
|----------|----------|---------|--------------------------------------------------------------------------|
| `AWS_REGION` | Yes      | `eu-west-2` | The AWS region to use for AWS services                                   |
| `AWS_DEFAULT_REGION` | Yes      | `eu-west-2` | The default AWS region (should match AWS_REGION)                         |
| `AWS_ACCESS_KEY_ID` | Yes      | `test` | AWS access key ID (use `test` for local development with Localstack)     |
| `AWS_SECRET_ACCESS_KEY` | Yes      | `test` | AWS secret access key (use `test` for local development with Localstack) |
| `PROTOTYPE_PASSWORD` | No       | - | Password protection for the prototype                                    |
| `API_BASE_URL` | Yes      | - | ai-defra-search-agent chat API URL                                       |
| `AUTH_ENABLED` | No       | `true` | Enable or disable authentication                                         |
| `MS_ENTRA_TENANT_ID` | Yes       | - | Microsoft Entra tenant ID                                                |
| `MS_ENTRA_CLIENT_ID` | Yes       | - | Microsoft Entra client ID                                                |
| `MS_ENTRA_CLIENT_SECRET` | Yes       | - | Microsoft Entra client secret                                            |
| `MS_ENTRA_REDIRECT_HOST` | Yes       | `http://localhost:3000` | Redirect host for Microsoft Entra authentication                         |

## Running the Application

### Building the Docker Image

Container images are built using Docker Compose. First, build the Docker image:

```bash
docker compose build
```

### Starting the Docker Container

After building the image, run the service locally in a container alongside Redis:

```bash
docker compose up
```

Use the `-d` flag at the end of the above command to run in detached mode (e.g., if you wish to view logs in another application such as Docker Desktop):

```bash
docker compose up -d
```

The application will be available at `http://localhost:3000`.

To stop the containers:

```bash
docker compose down
```

## Tests

### Running Tests

Run the tests with:

```bash
npm run docker:test
```

This command will:
1. Stop any running containers
2. Build the service
3. Run the test suite
4. Generate coverage reports in the `./coverage` directory

## Security Scanning

### Trivy Vulnerability Scan

[Trivy](https://github.com/aquasecurity/trivy) is used to scan for security vulnerabilities in dependencies and the filesystem. The scan runs automatically via GitHub Actions and checks for CRITICAL, HIGH, MEDIUM, and LOW severity issues.

#### Running Trivy Locally

To run the Trivy scan locally, first install Trivy by following the [installation instructions](https://aquasecurity.github.io/trivy/latest/getting-started/installation/).

Once installed, run the scan from the project root:

```bash
trivy repository --include-dev-deps --format table --exit-code 1 --severity CRITICAL,HIGH,MEDIUM,LOW --ignorefile .trivyignore .
```

The scan will:
- Check the entire repository for vulnerabilities
- Respect ignore rules defined in `.trivyignore`
- Exit with code 1 if any vulnerabilities are found

## Server-side Caching

We use Catbox for server-side caching. By default, the service will use CatboxRedis when deployed and CatboxMemory for local development. You can override the default behavior by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or `memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each instance of the service and it will not persist between restarts.

### Conversation Caching

The application implements conversation caching to provide resilience when the chat API is unavailable. This ensures users can still see their conversation history even during service disruptions.

**How it works:**

1. **After Successful API Response**: The complete conversation (including the AI's response) is updated in the cache.
2. **On API Failure**: If the chat API returns an error, the application retrieves the cached conversation from Redis and displays it to the user, allowing them to see their previous messages.

This approach eliminates the need to call a separate endpoint (`/chat/{conversationId}`) to retrieve conversations on error, making the error handling more efficient and resilient.

**Automatic Cleanup with TTL:**

Conversations are stored with a Time-To-Live (TTL) that matches the session cache TTL (default: 4 hours). This hybrid approach provides:

- **Active conversations stay alive**: Each time a user interacts with a conversation (sends a question), the TTL is reset, extending the expiry time.
- **Automatic cleanup of stale conversations**: Abandoned conversations are automatically removed by Redis after the TTL expires, preventing stale data from accumulating.
- **Manual clearing**: Users can explicitly clear conversations using the "Clear conversation" button, which immediately removes the conversation from cache.

The conversation cache is implemented in `src/server/start/conversation-cache.js` and uses the same Redis/Catbox infrastructure as session caching.

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
