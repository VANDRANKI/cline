# Cline Contributor Quick Reference

## Build & compile

```bash
npm install
npm run compile       # TypeScript compilation (must pass with 0 errors)
npm run watch         # watch mode during development
npm run protos        # regenerate gRPC types after .proto changes
```

## Running the extension in development

Press **F5** in VS Code to open an Extension Development Host, or:

```bash
code --extensionDevelopmentPath=$(pwd)
```

## Testing

```bash
npm run test:unit     # unit tests
npm run check-types   # TypeScript type check
```

## Before opening a PR

```bash
npm run check-types && npm run test:unit && npm run compile
```

All three must pass with zero errors.

## Changeset

For user-facing changes significant enough to warrant a changelog entry:

```bash
npm run changeset
# Choose 'patch' (NEVER minor or major)
# Write a one-line description of the user-visible change
```

Skip the changeset for internal refactors, typo fixes, and changes that
users would not notice.

## Common gotchas

- After editing a `.proto` file, always run `npm run protos`.
- New `ClineSay` enum values require an update to
  `src/shared/proto-conversions/cline-message.ts`.
- Webview code lives in `webview-ui/src/` and is compiled separately from
  the extension host code.
- Use `logger.info("...", { key: value })` — never `console.log` with
  interpolated strings in production code paths.
