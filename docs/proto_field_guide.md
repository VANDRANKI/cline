# Proto Field Reference for Common Cline Types

Quick reference for the proto messages used across the Cline extension.

## Common Messages (`proto/cline/common.proto`)

| Message            | Fields                  | Use for                              |
|--------------------|-------------------------|--------------------------------------|
| `Empty`            | (none)                  | RPCs with no meaningful return value |
| `StringRequest`    | `value: string`         | Single string argument               |
| `Int64Request`     | `value: int64`          | Single integer argument              |
| `BoolRequest`      | `value: bool`           | Single boolean argument              |

Use `StringRequest` for: scroll-to-section, select-by-name, lookup-by-id.
Use `Int64Request` for: select-by-index, seek-to-offset.
Use `Empty` for: confirm, dismiss, cancel, reset.

## Task Messages (`proto/cline/task.proto`)

- `ClineSay` enum: all types of say messages the assistant can emit
- `ClineAsk` enum: all types of questions the assistant can ask the user
- `ClineMessage`: wraps a say or ask with its text payload and timestamp
- `ExplainChangesRequest`: initiates the explain-changes streaming RPC

## UI Messages (`proto/cline/ui.proto`)

- `ScrollToSettingsRequest`: which settings section to scroll to
- `SelectFilesRequest`: multi-file picker configuration
- `BrowserActionRequest`: navigate/click/type in the built-in browser

## When to Add a New Message vs Reuse Common Types

**Use `StringRequest`** when the only data you need is a single string
(e.g., a path, a name, a section ID). Do not create `MyFeatureNameRequest`
just to wrap a string — it adds proto boilerplate for no gain.

**Create a new message** when you have 2+ fields, or when the semantics
of the string value would be ambiguous to a future reader.

**Use streaming return** (`stream MyChunk`) only when the response is
inherently incremental (LLM output, file scanning progress). Single
computations that take time should use async/await, not streaming.
