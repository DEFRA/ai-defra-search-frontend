# Rules

SCSSS
- Always reuse, never rewrite or add unless absolutely necessary
- Custom classses should start with "app"

Config
- Envars should be defined in example.env and test.env only
- Always use the config.js file to access envars
- Convict does not need to be tested!

Cache and Session management
- authenticated cookies using the HAPI cookie plugin

server.js
- Split this out into a couple of files

NEVER use common/helpers
- Modules should have intention revealing names

Styleguide
- Digest/Summarise the existing JS styleguide: https://github.com/DEFRA/aice-team/blob/main/documentation/style-guides/javascript.md

Nunjucks
- All file templates should use the root directory `/src/server`
- Other stuff about what good and bad nunjucks looks like
- Simple as possible
- Split out into multiple files rather than embedding if statements etc
- Use view models, e.g:
  return h.view(MY_CUSTOM_PAGE_PATH, myCustomPageViewModel)

Logging
- Use the createLogger function
- Use structured logs
- Do just enough logging for debugging
- Every path in the top level router should have a log
- Never log sensitive information, system information,

Route Architecture
- Controllers should be as simple as possible
- All logic should be in the service layer
- No HAPI dependencies should be passed to the service layer
// TODO: Lets define what a good clean approach is for our routes
router -> index -> controller -> service
- Deciding if API calls need pulling out into repositories, shared services etc is dependent on reuse across the code base. i.e. DRY
- It's okay to do simple solutions, directly in the route src folder until reuse is required

```javascript
const { createLogger } = require('src/server/common/helpers/logging/logger');
const logger = createLogger();

// TODO: Understand child loggers
// Create child logger with request context
const requestLogger = logger.child({
  requestId: 'req-123-abc',
  traceId: 'trace-789-xyz',
  userId: 'user-456' // sanitized identifier
});

// All subsequent logs will include this context
requestLogger.info('Processing payment');
requestLogger.debug({ amount: 100 }, 'Payment validated');
```

# Testing
// TODO: Let's start by making an example of a good unit test module

Controllers have HAPI dependency on "h"
There does not need to be any unit tests for the controllers
They should be covered by integration tests


Test Pyramids
Business Driven Development - i.e. good test names

**One test = multiple related assertions**
- Group related behaviors into comprehensive tests
- Not one assertion per test
- Test one scenario fully


## Mocking
- Do not test mocks!
- Always use Nock when mocking API responses. e.g: [insert example]


# Monitoring


# Traceability



