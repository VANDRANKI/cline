# Webview Component Testing Guide

This guide covers testing patterns for Cline's React webview components
(`webview-ui/src/components/`).

## 1. Setup

Cline uses Vitest with `@testing-library/react`.

```bash
cd webview-ui
npm run test        # run all tests in watch mode
npm run test:run    # run once and exit (CI)
```

## 2. Basic component test

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 3. Mocking VS Code API

The webview calls `vscode.postMessage` to send messages to the extension host.
Mock it to test message dispatch without a real extension.

```tsx
import { vi } from 'vitest';

const mockPostMessage = vi.fn();
vi.mock('../../utils/vscode', () => ({
  vscode: { postMessage: mockPostMessage },
}));

it('posts a message when button is clicked', async () => {
  const { getByRole } = render(<ActionButton action="approve" />);
  await userEvent.click(getByRole('button', { name: /approve/i }));
  expect(mockPostMessage).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'action', action: 'approve' }),
  );
});
```

## 4. Testing components that read extension state

Components read state from the `ExtensionStateContext`. Wrap under a provider
with the minimal state required.

```tsx
import { ExtensionStateContextProvider } from '../../context/ExtensionStateContext';

function renderWithState(ui: React.ReactElement, state = {}) {
  return render(
    <ExtensionStateContextProvider value={{ ...defaultState, ...state }}>
      {ui}
    </ExtensionStateContextProvider>
  );
}

it('shows task when state has currentTask', () => {
  renderWithState(<TaskHeader />, { currentTask: { id: '1', text: 'test' } });
  expect(screen.getByText('test')).toBeInTheDocument();
});
```

## 5. Testing ChatRow rendering

`ChatRow` is the most complex component — use snapshot tests for regression.

```tsx
import { ChatRow } from '../chat/ChatRow';

it('matches snapshot for tool_use message', () => {
  const { asFragment } = render(
    <ChatRow
      message={{ type: 'say', say: 'tool', text: 'Running bash', ts: 1 }}
      isLast={true}
      lastModifiedMessage={undefined}
    />
  );
  expect(asFragment()).toMatchSnapshot();
});
```

Update snapshots after intentional UI changes:

```bash
npm run test:run -- --update-snapshots
```

## 6. Testing cancelled/interrupted states

Verify that in-progress animations do not remain visible after a task is cancelled.

```tsx
it('shows cancelled state when task is interrupted', () => {
  render(
    <ChatRow
      message={{ type: 'say', say: 'my_operation', text: JSON.stringify({ status: 'generating' }), ts: 1 }}
      isLast={false}  // not last = interrupted
      lastModifiedMessage={{ ask: 'resume_task' }}
    />
  );
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
});
```

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Testing implementation details | Assert on visible output and DOM |
| No provider wrapper | Wrap with `ExtensionStateContextProvider` |
| Real `vscode.postMessage` | Always mock it in unit tests |
| Ignoring interrupted-state rendering | Add tests for `isLast=false` + `resume_task` |
