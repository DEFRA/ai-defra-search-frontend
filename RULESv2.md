GDS Frontend - Rules

## AI Assistant Behavior
As an AI assistant creating a GDS compliant frontend you should:
- **Prioritize accessibility** and government standards in all suggestions
- **Use semantic search** to understand existing patterns before suggesting new code
- **Read existing files** to understand the current implementation before making changes
- **Follow the established folder structure** and naming conventions
- **Test suggestions** against GOV.UK Design System guidelines
- **Explain the reasoning** behind accessibility and content design choices
- **Suggest improvements** that align with user-centered design principles

## Project Overview
This project is a web application built using the GDS components for frontend development for internal Defra services. The application is:
- **For internal users**: Civil servants and Defra staff, not the public
- **Department**: Department for Environment, Food and Rural Affairs (Defra)
- Used for providing an interface that lets users interact with an AI assistant to complete tasks, such as summarising documents, redacting PII...

## Internal User Considerations
When designing for internal users (civil servants):
- **Assume domain knowledge**: Users have specialist knowledge of Defra processes and terminology
- **Efficiency over explanation**: Internal users need to complete tasks quickly and efficiently
- **Professional tone**: Content can be more formal and use appropriate technical terms
- **Reduced hand-holding**: Less need for extensive guidance compared to public services
- **Focus on productivity**: Prioritise speed, keyboard shortcuts, and batch operations
- **Role-based access**: Consider different user roles and permissions within Defra
- **Integration with other systems**: May need to work alongside existing internal tools

## Technical Framework
- **Server-side**: Node.js and Hapi
- **Templating**: Nunjucks
- **UI Components**: GOV.UK Design System
- **Infrastructure**: Using Prototype Kit's built-in routing and templating features

## Folder Structure
```
[root]/
├── src/
│   ├── client/                    # Client-side assets
│   │   ├── javascripts/          # Client-side JavaScript
│   │   ├── stylesheets/          # CSS/SCSS files
│   │   └── common/               # Shared client resources
│   ├── server/                   # Server-side code
│   │   ├── common/               # Shared server resources
│   │   │   ├── components/       # Reusable Nunjucks components
│   │   │   ├── templates/        # Template structure
│   │   │   │   ├── layouts/      # Page layouts
│   │   │   │   └── partials/     # Partial templates
│   │   │   ├── helpers/          # Helper functions
│   │   │   └── constants/        # Configuration constants
│   │   ├── start/                # Start/home page feature
│   │   ├── login/                # Login feature
│   │   ├── health/               # Health check endpoints
│   │   ├── error/                # Error pages
│   │   ├── router.js             # Route definitions
│   │   └── server.js             # Express server setup
│   ├── config/                   # Application configuration
│   └── index.js                  # Entry point
├── test/                         # Unit tests
└── tests/                        # Integration tests
```

## Code Standards

### Templates
- Use Nunjucks macros from GOV.UK Design System
- Always include macro imports at the top of templates:
  ```nunjucks
  {% from "govuk/components/input/macro.njk" import govukInput %}
  {% from "govuk/components/button/macro.njk" import govukButton %}
  ```


### Validation & Accessibility
- Return validation errors with `govukErrorSummary`
- Add per-field error items
- Meet WCAG 2.2 AA standards
- Follow Home Office accessibility poster guidance:
  - Appropriate colour contrast
  - Visible focus styles
  - Error feedback announced via `aria-live`
  - All inputs properly labelled

### Content Design
- Follow GOV.UK style guide with adaptations for internal users:
  - Sentence case
  - ISO date format (e.g., "24 April 2025")
  - Clear, professional language (can use Defra-specific terminology)
  - No ampersands
  - Active voice
- Front-load key information
- One idea per sentence
- Address users directly using second person ("you")
- For internal services, you can:
  - Use technical terms and acronyms familiar to Defra staff
  - Be more concise where appropriate
  - Focus on task completion rather than extensive explanation

### Code Organization
- Define and reuse Nunjucks filters (e.g., `toMonth`, `toMoney`)
- Separate data from presentation

### Formatting Standards
- JavaScript/TypeScript: 2 spaces indentation, no tabs
- Nunjucks templates: 2 spaces indentation, no tabs
- Use ES2020 features with CommonJS modules
- Enable TypeScript strict mode when applicable

### UI Components
Use GOV.UK Design System components for:
- Form elements (inputs, checkboxes, radio buttons)
- Error messages and validation feedback
- Success messages and confirmation screens
- Navigation elements including phase banners
- Information display (tables, lists, alerts)
- Progress indicators and loading states

## Development Workflow
When working with this codebase:
- **Search existing patterns** before creating new components
- **Reuse established components** and layouts where possible
- **Test accessibility** with screen readers and keyboard navigation
- **Validate against** GOV.UK Design System documentation

## File Creation Guidelines
When creating:
- **New feature/page**: Create folder in `/src/server/[feature-name]/` containing:
  - `index.js` - Plugin registration and route definitions
  - `controller.js` - Route handlers (GET/POST controllers)
  - `[feature-name].njk` - Nunjucks template
  - Optional: `[feature-name]-api.js` for API calls, `[feature-name]-schema.js` for validation
- **New component**: Create folder in `/src/server/common/components/[component-name]/` with component files
- **New layout**: Create file in `/src/server/common/templates/layouts/[layout-name].njk`
- **New partial template**: Create file in `/src/server/common/templates/partials/[partial-name].njk`
- **New helper function**: Create file in `/src/server/common/helpers/[helper-name].js`
- **Register routes**: Import and register the plugin in `/src/server/router.js`

## Quality Checklist
Before suggesting any code changes, ensure:
- [ ] Accessibility requirements are met
- [ ] GOV.UK Design System components are used correctly
- [ ] Content follows government style guide
- [ ] Error handling and validation is implemented
- [ ] Code follows established patterns in the project 