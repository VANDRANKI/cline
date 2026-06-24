# Development Quickstart

Practical notes for new contributors to the Cline VS Code extension.
For deep tribal knowledge see [CLAUDE.md](../CLAUDE.md).

## Prerequisites

- Node.js 18+
- npm
- VS Code with the "Extension Development" workflow

## Setup

```bash
git clone https://github.com/cline/cline
cd cline
npm install
```

## Build Commands

> **Important**: This is a VS Code extension. Use `compile`, not `build`.

```bash
# Compile TypeScript (extension host)
npm run compile

# Compile webview (React UI)
npm run build:webview

# Watch mode during development
npm run watch
npm run watch:webview  # in a second terminal

# After any .proto file change
npm run protos
```

## Running the Extension

1. Open the repo in VS Code.
2. Press `F5` to launch an Extension Development Host window.
3. The Cline panel appears in the Activity Bar.

## Key File Locations

| What | Where |
|------|-------|
| Extension entry point | `src/extension.ts` |
| Core task logic | `src/core/task/` |
| System prompt components | `src/core/prompts/system-prompt/` |
| Proto definitions | `proto/cline/` |
| Generated gRPC types | `src/shared/proto/` |
| Webview React app | `webview-ui/src/` |
| Chat message rendering | `webview-ui/src/components/chat/ChatRow.tsx` |

## Proto Workflow

Cline uses a gRPC-like protocol over VS Code message passing.
After editing any `.proto` file:

```bash
npm run protos
```

This regenerates:
- `src/shared/proto/` — shared type definitions
- `src/generated/grpc-js/` — service implementations
- `src/generated/nice-grpc/` — promise-based clients

## Adding a New Feature

1. Define the RPC in the appropriate `proto/cline/*.proto` file.
2. Run `npm run protos`.
3. Implement a handler in `src/core/controller/<domain>/`.
4. If it adds a new `ClineSay` type, update the conversion mapping in
   `src/shared/proto-conversions/cline-message.ts`.
5. Add UI rendering in `webview-ui/src/components/chat/ChatRow.tsx`.

## Running Tests

```bash
# Unit tests
npm run test:unit

# Regenerate test snapshots after system prompt changes
UPDATE_SNAPSHOTS=true npm run test:unit
```

## Changelog

For user-facing changes, create a changeset:

```bash
npm run changeset
# Select: patch
# Enter a short description of the change
```

Skip for internal refactors or changes users wouldn't notice.
