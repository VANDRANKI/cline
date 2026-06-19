# gRPC Protocol Architecture

Cline uses a gRPC-like protocol over VS Code's message-passing API for
communication between the extension host and the webview.

## Message flow

```
Webview                     Extension Host
  |                               |
  |-- gRPC request (JSON) ------->|
  |                               |-- Handler processes
  |                               |-- Calls core logic
  |<-- gRPC response (JSON) ------|
```

## Proto files

All service definitions live in `proto/`. Each domain has its own file:

| File | Service | Description |
|------|---------|-------------|
| `proto/cline/task.proto` | `TaskService` | Task lifecycle (start, stop, resume) |
| `proto/cline/ui.proto` | `UiService` | UI state updates and scrolling |
| `proto/cline/account.proto` | `AccountService` | Authentication and billing |
| `proto/cline/common.proto` | — | Shared types (`StringRequest`, `Empty`) |

## Adding a new RPC

1. Add the message and RPC definition to the relevant `.proto` file
2. Run `npm run protos` to regenerate TypeScript bindings
3. Implement the handler in `src/core/controller/<domain>/`
4. Wire the handler in the controller's `registerHandlers()` method
5. Call from the webview via the generated nice-grpc client

## Streaming RPCs

Use the `stream` keyword for responses that push multiple values:

```protobuf
rpc subscribeToTaskState (Empty) returns (stream TaskState);
```

The webview receives updates via an async iterator.
