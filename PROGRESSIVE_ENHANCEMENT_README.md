## Progressive enhancement: implemented approach (JavaScript-first)

This document now reflects the actual implementation in this repository: a JavaScript-first enhancement that preserves the server-rendered POST/redirect flow as the no-JS fallback.

Goals
- Provide a dynamic client experience for users with JavaScript enabled.
- Preserve the server-rendered POST/redirect flow as the no-JS fallback and deep-linking behaviour.

What we implemented
- A JSON API on the frontend service:
  - `POST /api/chat` — proxies to the backend agent via the existing `sendQuestion()` helper and returns `{ conversationId, messageId, status }`.
  - `GET /api/conversations/{id}` — proxies to the agent via the existing `getConversation()` helper and returns parsed conversation JSON for client consumption.
- A client enhancement module at `src/client/javascripts/chat.js` that:
  - Intercepts the `start` form submit when JS is available.
  - Calls `POST /api/chat` and immediately renders the user's message and a placeholder/loading state.
  - Polls `GET /api/conversations/{id}` using exponential backoff until the assistant message reaches `status: 'completed'` and then updates the DOM with the assistant response.
  - Updates browser history with the deep-link (`/start/{conversationId}`) when a new conversation is created.
- Wire-up: `src/client/javascripts/application.js` imports and calls `attachFormHooks()` so the chat enhancement is included in the built assets.

Key implementation notes
- The server still fully supports no-JS users: `POST /start` performs the same queueing and redirect to `/start/{id}`, and the server-rendered `GET /start/{id}` remains authoritative.
- The frontend uses a small cache (`conversation-cache.js`) and stores a placeholder assistant message when a question is queued so the no-JS view shows the pending state immediately.
- Polling is deliberately conservative (short initial interval + exponential backoff) to balance responsiveness and load.
- Temporary debug logging used during development has been removed before committing.

Files changed / primary locations
- `src/server/start/controller.js` — added JSON endpoints `apiChatController` and `apiGetConversationController` (these reuse `chat-api.js`).
- `src/server/start/chat-api.js` — helper functions to call the agent (`sendQuestion`, `getConversation`) are used by the new JSON endpoints.
- `src/client/javascripts/chat.js` — client-side enhancement (intercept submit, POST `/api/chat`, render placeholder, poll `/api/conversations/{id}`, render assistant message).
- `src/client/javascripts/application.js` — imports and invokes `attachFormHooks()` so the module is included in the build.

Operational notes
- Keep an eye on polling behaviour in production and consider server-side rate limits or a push-based mechanism if load grows.

To see the the mermaid diagram showing the 2 flows use: 
`
npx @mermaid-js/mermaid-cli -i PROGRESSIVE_ENHANCEMENT.mmd -o PROGRESSIVE_ENHANCEMENT.svg
`
