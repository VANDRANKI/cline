# Development Guide

This document is the primary reference for developers working on the Cline VS Code extension. It covers the repository layout, build system, gRPC/proto workflow, the system prompt variant system, and changeset conventions.

## Repository Structure

```
cline/
├── src/                         # Extension host code (Node.js / TypeScript)
│   ├── core/                    # Agent logic, task runner, tool executor
│   │   ├── controller/          # gRPC handler implementations (one per domain)
│   │   ├── prompts/             # System prompt construction
│   │   │   └── system-prompt/
│   │   │       ├── components/  # Reusable prompt sections (rules, capabilities, …)
│   │   │       ├── variants/    # Model-family-specific configs and overrides
│   │   │       │   ├── generic/
│   │   │       │   ├── next-gen/
│   │   │       │   ├── xs/
│   │   │       │   └── ...
│   │   │       └── tools/       # Tool definitions, one file per tool
│   │   └── task/                # Task lifecycle and tool execution
│   ├── generated/               # Auto-generated gRPC stubs (do not edit)
│   └── shared/                  # Types and proto-conversion helpers shared with webview
│       └── proto/               # Generated TypeScript types from .proto files
├── webview-ui/                  # React frontend (runs inside the VS Code webview)
│   └── src/
│       ├── components/          # UI components including ChatRow
│       └── services/            # gRPC client (auto-generated)
├── proto/                       # Protobuf definitions
│   ├── cline/
│   │   ├── task.proto           # Task-level RPCs and messages
│   │   ├── ui.proto             # UI messages (ClineSay, ClineAsk enums)
│   │   ├── account.proto        # Auth and account management
│   │   └── common.proto         # Shared simple types (StringRequest, Empty, …)
└── package.json                 # Scripts, dependencies, extension manifest
```

## Prerequisites

- **Node.js** v20+ (check `.nvmrc` for the pinned version)
- **npm** (bundled with Node.js)
- **VS Code** 1.84 or later

## Installing Dependencies

```bash
npm run install:all
```

This installs dependencies for both the extension host (`/`) and the webview (`webview-ui/`).

## Compiling the Extension

```bash
npm run compile
```

This runs the TypeScript compiler (`tsc`) and `esbuild` to bundle the extension. If the command fails, read the TypeScript errors carefully — they usually point to a missing type, an import that changed, or a stale generated file.

For watch mode (recompile on save):

```bash
npm run watch
```

Or, to also regenerate protos and then watch:

```bash
npm run dev
```

## Running the Extension in Development Mode

1. Open this repository in VS Code.
2. Press **F5** (or go to **Run → Start Debugging**).
3. A new VS Code window labelled **[Extension Development Host]** will open with Cline loaded.
4. Make a change, run `npm run compile` (or let watch mode pick it up), then reload the Extension Development Host window with **Ctrl+R** / **Cmd+R**.

If you see an error about `esbuild-problem-matchers`, install the extension from the VS Code marketplace and try again.

## Working with Proto / gRPC

The extension and the webview communicate via a gRPC-like protocol layered on top of VS Code's message-passing API.

### When to regenerate

Run `npm run protos` any time you:

- Add or change a `.proto` file under `proto/`
- Add a new enum value to `ClineSay` or `ClineAsk`
- Add a new RPC method to any service

```bash
npm run protos
```

This regenerates:

| Output directory | Contents |
|---|---|
| `src/shared/proto/` | Shared TypeScript types |
| `src/generated/grpc-js/` | Service stubs (grpc-js style) |
| `src/generated/nice-grpc/` | Promise-based client wrappers |
| `src/generated/hosts/` | Handler entry points |

Do **not** hand-edit files in `src/generated/` or `src/shared/proto/` — they are overwritten on every `npm run protos` run.

### Adding a new enum value

After editing `proto/cline/ui.proto` (or `task.proto`) and regenerating, you must also update the conversion mapping:

```
src/shared/proto-conversions/cline-message.ts
```

Missing mappings will not cause a compile error but will silently drop messages at runtime.

## System Prompt Variant System

Cline builds its system prompt from modular **components** assembled by model-family **variants**.

### Components

Reusable prompt sections live in `src/core/prompts/system-prompt/components/`:

- `rules.ts` — core behavioral rules
- `capabilities.ts` — what the agent can do
- `editing_files.ts` — file-editing instructions
- etc.

### Variants

Each model family has a directory under `src/core/prompts/system-prompt/variants/`:

| Directory | Target models |
|---|---|
| `generic/` | Default / fallback for any model |
| `next-gen/` | Claude 4, GPT-5, Gemini 2.5 (non-native tool use) |
| `native-next-gen/` | Same models, native tool-use format |
| `xs/` | Local / small models (compact prompt) |
| `hermes/`, `glm/` | Specific open-source models |

Each variant directory contains:

- `config.ts` — which tools and components are active
- `template.ts` (optional) — overrides for specific components

If a variant does not export a template override, the shared component from `components/` is used automatically.

### Snapshot tests

After any system prompt change, regenerate snapshots:

```bash
UPDATE_SNAPSHOTS=true npm run test:unit
```

Snapshots live in `src/core/prompts/system-prompt/__tests__/__snapshots__/`.

## Changesets

Cline uses [Changesets](https://github.com/changesets/changesets) for version management.

- **Create a changeset** for any user-facing change: `npm run changeset`
- Choose `patch` for bug fixes, `minor` for new features, `major` for breaking changes.
- Documentation-only changes, internal refactors, and minor UI tweaks that users would not notice do **not** need a changeset.
- Never create `major` or `minor` bumps without explicit maintainer approval.

## Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires a display; uses Playwright + VS Code)
npm run test:e2e
```

## Code Formatting and Linting

```bash
npm run lint          # ESLint check
npm run format        # Prettier check
npm run format:fix    # Auto-fix formatting issues
```

Both must pass before a PR can be merged.
