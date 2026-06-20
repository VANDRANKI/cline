# Debugging the Cline Extension

Practical notes for contributors debugging issues in the Cline VS Code
extension.

---

## Running the extension in development mode

```bash
# Install dependencies
npm install

# Compile TypeScript in watch mode
npm run watch

# Open VS Code Extension Development Host
# Press F5 in VS Code, or:
code --extensionDevelopmentPath=$(pwd)
```

Enable extension host logging for verbose output:
```
Help > Toggle Developer Tools > Console
```

---

## Logging inside the extension

All structured logging goes through `src/services/logging/`.

```typescript
import { logger } from "../services/logging"

// Good: structured key-value pairs
logger.info("Task started", { taskId, model, contextLength })

// Avoid: unstructured messages are harder to query
console.log(`Task ${taskId} started with model ${model}`)
```

---

## gRPC / protobuf workflow

1. Edit the relevant `.proto` file in `proto/cline/`.
2. Run code generation:
   ```bash
   npm run protos
   ```
3. Check the generated files in:
   - `src/shared/proto/` — shared type definitions
   - `src/generated/grpc-js/` — service implementations
   - `src/generated/nice-grpc/` — promise-based clients
4. If you added a new `ClineSay` enum value, update the conversion mapping in
   `src/shared/proto-conversions/cline-message.ts`.

---

## Common issues

### Extension host crashes on startup

1. Check the output panel: `View > Output > Cline`.
2. Look for `TypeError` or `Cannot find module` errors in the console.
3. Run `npm run compile` to ensure TypeScript compiled without errors.

### Webview shows a blank page

1. Check the DevTools console (right-click webview > Inspect Element) for
   JavaScript errors.
2. Ensure `npm run build:webview` completed successfully.
3. Verify that the webview's Content Security Policy is not blocking resources.

### Proto changes not reflected in the UI

The generated gRPC code must be regenerated after proto changes:

```bash
npm run protos && npm run compile
```

If the webview still shows stale data, hard-reload the Extension Development
Host window with `Ctrl+Shift+P > Developer: Reload Window`.

---

## Testing before opening a PR

```bash
# Type check
npm run check-types

# Unit tests
npm run test:unit

# Compile (must pass with zero errors)
npm run compile
```
