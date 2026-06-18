# Cline Streaming and Proto Patterns

This guide covers the non-obvious patterns around streaming responses,
cancellation detection, and ChatRow state management for contributors
adding new tool types or streaming say types.

## Streaming vs Unary in the Proto Bridge

Cline's gRPC-style bridge over VS Code message passing has two call modes:

**Unary**: one request, one response. Used for simple actions:
```typescript
// Controller side (extension)
async scrollToSettings(request: StringRequest): Promise<Empty> {
  // do work
  return Empty.create()
}

// Webview side (client)
await UiServiceClient.scrollToSettings(StringRequest.create({ value: 'browser' }))
```

**Server-streaming**: one request, multiple response chunks. Used for LLM output:
```typescript
// Controller: emit multiple chunks
async streamExplanation(request: ExplainChangesRequest): AsyncGenerator<ExplanationChunk> {
  for await (const chunk of llm.streamText(prompt)) {
    yield ExplanationChunk.create({ text: chunk, done: false })
  }
  yield ExplanationChunk.create({ text: '', done: true })
}

// Webview: consume stream
for await (const chunk of TaskServiceClient.streamExplanation(request)) {
  if (chunk.done) break
  setExplanation(prev => prev + chunk.text)
}
```

## Timeout Detection in ChatRow

When a streaming operation is running (status = "generating"), it has no
naturally-terminal state. The ChatRow must detect when it's been abandoned:

```typescript
// Pattern from CLAUDE.md for any new streaming say type
const wasCancelled =
  status === 'generating' &&
  (
    !isLast ||  // another message arrived after this one
    lastModifiedMessage?.ask === 'resume_task' ||  // just cancelled
    lastModifiedMessage?.ask === 'resume_completed_task'
  )

const isGenerating = status === 'generating' && !wasCancelled
const isTimedOut = status === 'generating' && !wasCancelled && elapsedSeconds > 30
```

For a 30-second timeout display:

```typescript
const [elapsedSeconds, setElapsedSeconds] = useState(0)

useEffect(() => {
  if (!isGenerating) {
    setElapsedSeconds(0)
    return
  }
  const interval = setInterval(() => {
    setElapsedSeconds(s => s + 1)
  }, 1000)
  return () => clearInterval(interval)
}, [isGenerating])
```

## Adding a New Streaming Say Type

When you add a new `ClineSay` enum value for a streaming operation:

1. **Add to proto** (`proto/cline/ui.proto`):
   ```protobuf
   enum ClineSay {
     // ... existing values ...
     MY_STREAMING_OP = 30;
   }
   ```

2. **Run protos**: `npm run protos`

3. **Add to ExtensionMessage.ts**:
   ```typescript
   export type ClineSayMyStreamingOp = {
     type: 'my_streaming_op'
     status: 'generating' | 'complete' | 'error'
     content?: string
   }
   ```

4. **Add conversion** (`src/shared/proto-conversions/cline-message.ts`):
   ```typescript
   case ClineSay.MY_STREAMING_OP:
     return { type: 'my_streaming_op', ...parsePayload(say.text) }
   ```

5. **Handle in ChatRow.tsx** with the `wasCancelled` pattern (never
   display an infinite spinner — always handle the cancel state).

6. **Clean up in the backend** when `taskState.abort` is set:
   ```typescript
   const result = await streamMyOperation(request)
   if (taskState.abort) {
     await cleanup()  // close connections, cancel pending work
     return
   }
   ```

## Proto Field Naming

Follow the existing conventions:
- Message names: `PascalCase` (e.g., `ExplainChangesRequest`)
- Field names: `snake_case` (e.g., `task_id`, `file_path`)
- Enum values: `UPPER_SNAKE_CASE` (e.g., `GENERATE_EXPLANATION`)
- RPC names: `camelCase` (e.g., `explainChanges`)

For new streaming RPCs:
```protobuf
// In the relevant service
rpc streamMyOperation(MyOperationRequest) returns (stream MyOperationChunk);
```

## Testing Streaming Components

To test a ChatRow component that has streaming state:

```typescript
import { render, screen } from '@testing-library/react'
import { ChatRow } from '../ChatRow'

test('shows timeout message after 30s if still generating', () => {
  jest.useFakeTimers()
  render(
    <ChatRow
      message={{ type: 'my_streaming_op', status: 'generating', content: '' }}
      isLast={true}
      lastModifiedMessage={undefined}
    />
  )

  // Fast-forward 31 seconds
  act(() => jest.advanceTimersByTime(31_000))

  expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument()
  jest.useRealTimers()
})
```
