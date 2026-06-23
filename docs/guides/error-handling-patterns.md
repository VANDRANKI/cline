# Error Handling Patterns in Cline

This guide covers the key patterns for robust error handling in the Cline VS Code extension.

## Extension Host vs Webview Errors

Cline has two distinct error domains:
- **Extension host** (Node.js process): tool execution, file operations, LLM API calls
- **Webview** (browser context): UI rendering, user input, gRPC message handling

Errors in the extension host do NOT automatically surface in the webview — you must explicitly forward them.

## Forwarding Errors to the Webview

Use the gRPC message channel to send error states:

```typescript
// In extension host (controller)
try {
  const result = await executeShellCommand(command);
  // send success
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await this.say('error', `Command failed: ${message}`);
}
```

## Tool Execution Errors

All tool handlers follow this pattern:

```typescript
export async function executeReadFileTool(
  block: ToolUse,
  state: TaskState,
): Promise<ToolResult> {
  const filePath = block.params.path;
  if (!filePath) {
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: 'Error: Missing required parameter: path',
      is_error: true,
    };
  }

  try {
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.file(filePath),
    );
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: Buffer.from(content).toString('utf-8'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: `Error reading file '${filePath}': ${message}`,
      is_error: true,
    };
  }
}
```

## LLM API Error Classification

Distinguish retryable from fatal errors:

```typescript
function classifyApiError(error: unknown): 'retryable' | 'fatal' | 'rate_limit' {
  if (!(error instanceof Error)) return 'fatal';
  const msg = error.message.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('429')) return 'rate_limit';
  if (msg.includes('timeout') || msg.includes('econnreset')) return 'retryable';
  return 'fatal';
}
```

## Cancelled Tasks

Check `state.abort` after every async operation to respect cancellation:

```typescript
async function runWithCancellation(
  state: TaskState,
  steps: Array<() => Promise<void>>,
): Promise<void> {
  for (const step of steps) {
    if (state.abort) {
      throw new Error('Task cancelled by user');
    }
    await step();
  }
}
```

## Webview Error Display

In `ChatRow.tsx`, always handle both the error and the cancelled states:

```tsx
const isError = message.type === 'say' && message.say === 'error';
const isCancelled = message.type === 'say' && message.say === 'error' && !isLast;

if (isError) {
  return (
    <div className="text-red-500">
      <span>{message.text}</span>
      {isCancelled && <span className="text-gray-400 ml-2">(cancelled)</span>}
    </div>
  );
}
```

## Proto Error Types

When adding new error categories, define them in `proto/cline/common.proto`:

```protobuf
enum ErrorSeverity {
  ERROR_SEVERITY_UNSPECIFIED = 0;
  ERROR_SEVERITY_WARNING = 1;
  ERROR_SEVERITY_ERROR = 2;
  ERROR_SEVERITY_FATAL = 3;
}
```

Run `npm run protos` after any `.proto` changes.

## Best Practices

1. **Never swallow errors silently** — always forward to the webview or log at `warn`+.
2. **Use `instanceof Error` before `.message`** — thrown values can be non-Error objects.
3. **Check `state.abort` after each `await`** — VS Code can kill the extension host at any time.
4. **Return error results from tools** — prefer `is_error: true` results over throwing, so the LLM can attempt recovery.
5. **Log with context** — include the tool name and relevant parameters in every error log.
