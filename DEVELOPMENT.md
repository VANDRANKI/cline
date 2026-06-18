# Cline Development Guide

This document supplements `CLAUDE.md` with practical setup and pattern
guidance for contributors who are new to the codebase.

## Prerequisites

- Node.js (see `.nvmrc`)
- VS Code (to test the extension)

## Setup

```bash
git clone https://github.com/VANDRANKI/cline.git
cd cline
npm install
```

## Build

```bash
npm run compile     # TypeScript compile
npm run watch       # Watch mode
```

> **Note**: Use `npm run compile`, not `npm run build` — this is a VS Code
> extension project and follows VS Code build conventions.

## Running Tests

```bash
npm test            # unit tests (Mocha)
```

## gRPC / Protobuf

The extension uses a gRPC-like protocol over VS Code message passing.

**After any `.proto` change:**

```bash
npm run protos
```

This regenerates:
- `src/shared/proto/` — shared types
- `src/generated/grpc-js/` — service implementations
- `src/generated/nice-grpc/` — promise-based clients

**Key files:**
- `proto/cline/task.proto` — task-level RPCs
- `proto/cline/ui.proto` — UI events and `ClineSay` enum
- `proto/cline/common.proto` — shared simple types

## Adding a New Tool

1. Add to `ClineDefaultTool` enum in `src/shared/tools.ts`
2. Create tool spec in `src/core/prompts/system-prompt/tools/`
3. Register in `src/core/prompts/system-prompt/tools/init.ts`
4. Add to variant configs in `src/core/prompts/system-prompt/variants/*/config.ts`
5. Create handler in `src/core/task/tools/handlers/`
6. After any change, regenerate snapshots:
   ```bash
   UPDATE_SNAPSHOTS=true npm run test:unit
   ```

## ChatRow Cancelled State Pattern

When a ChatRow shows a spinner, detect cancellation with:

```typescript
const wasCancelled =
  status === "generating" &&
  (!isLast ||
    lastModifiedMessage?.ask === "resume_task" ||
    lastModifiedMessage?.ask === "resume_completed_task")
```

- `!isLast` catches: cancelled, resumed, then something else ran
- `lastModifiedMessage?.ask === "resume_task"` catches: just cancelled,
  not yet resumed, this message is still technically last

## Modifying the System Prompt

Read `src/core/prompts/system-prompt/README.md` first. Key points:

- Components are in `components/` (shared sections)
- Variants in `variants/` (model-specific overrides)
- After any change, always regenerate snapshots with
  `UPDATE_SNAPSHOTS=true npm run test:unit`

## Commit Convention

```
feat: add explain-changes tool with streaming UI
fix: handle cancelled state in BrowserSessionRow
docs: clarify gRPC proto workflow in CLAUDE.md
test: add snapshot for next-gen variant with MCP enabled
```

## Changesets

For user-facing changes, create a changeset:

```bash
npm run changeset
```

Only create patch-level bumps. The maintainers handle minor/major.
