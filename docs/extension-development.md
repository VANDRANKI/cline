# Cline Extension Development Guide

This guide explains how to set up a development environment and contribute to the Cline VS Code extension.

## Prerequisites

- Node.js v20+ (see `.nvmrc`)
- VS Code or Cursor IDE
- Recommended: install VS Code extension development dependencies

## Setup

```bash
npm install
npm run compile
```

## Running the Extension

Press `F5` in VS Code to launch a new Extension Development Host window with Cline loaded.

Or build and watch:

```bash
npm run watch
```

## Testing

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run all tests
npm test
```

## Proto/gRPC Workflow

The extension uses gRPC-like message passing between the VS Code extension host and the webview.

```bash
# After modifying any .proto files, regenerate TypeScript types:
npm run protos
```

Generated files appear in:
- `src/shared/proto/` — shared type definitions
- `src/generated/grpc-js/` — service implementations
- `src/generated/nice-grpc/` — promise-based clients

## Architecture Overview

```
Extension Host (Node.js)
│
├── src/core/controller/   # Business logic handlers
├── src/core/task/         # Task execution engine
├── src/core/prompts/      # System prompt construction
└── src/integrations/      # File system, terminal, browser

Webview (React)
│
└── webview-ui/src/
    ├── components/chat/    # Chat UI components
    ├── components/settings/ # Settings panels
    └── context/            # React context providers
```

## Adding a New Tool

1. Add the tool to `ClineDefaultTool` enum in `src/shared/tools.ts`
2. Create a tool definition file in `src/core/prompts/system-prompt/tools/`
3. Register it in `src/core/prompts/system-prompt/tools/init.ts`
4. Add it to all variant configs in `src/core/prompts/system-prompt/variants/*/config.ts`
5. Create the handler in `src/core/task/tools/handlers/`
6. Wire up in `ToolExecutor.ts`
7. Update snapshots: `UPDATE_SNAPSHOTS=true npm run test:unit`

## Error Handling Patterns

```typescript
// Good: specific error types with context
try {
  const result = await executeCommand(command);
  return result;
} catch (error) {
  if (error instanceof CommandTimeoutError) {
    throw new ToolError(`Command timed out after ${error.timeout}ms: ${command}`);
  }
  throw new ToolError(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
}

// Good: never swallow errors silently
// Bad: empty catch blocks or generic console.error without re-throw
```

## Code Quality

```bash
# Lint with Biome
npm run lint

# Auto-fix
npm run lint:fix

# Type check
npm run typecheck
```
