# Webview Debugging Guide

Debugging the Cline webview requires different tools than standard Node.js
extension debugging. This guide covers the main techniques.

## Opening DevTools for the Webview

The webview runs in a separate Chromium context. To open its DevTools:

1. Open the VS Code Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run: **Developer: Open Webview Developer Tools**
3. This opens a Chrome DevTools window scoped to the Cline panel

Alternatively, if the webview is in a separate panel:

```
Help > Toggle Developer Tools
```

then navigate to the **Frames** section and select the webview frame.

## Debugging gRPC Message Flow

Cline uses a gRPC-like protocol over VS Code's `postMessage`. To trace messages:

```typescript
// In webview-ui/src/utils/messaging.ts (or equivalent)
// Add temporary logging:
console.log('[webview] received message:', JSON.stringify(message, null, 2));
```

On the extension side:

```typescript
// In the extension host process:
outputChannel.appendLine(`[ext] sending: ${JSON.stringify(payload)}`);
```

The VS Code **Output** panel (select "Cline" channel) shows extension-side logs.

## Inspecting React State

In the webview DevTools Console, use React DevTools globals:

```javascript
// Find a component by display name
$r  // Currently selected component in React DevTools tab

// Programmatically find component state (React 18+)
const el = document.querySelector('[data-component="ChatRow"]');
```

Install the [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools)
browser extension — it works inside the webview DevTools window.

## Diagnosing Cancelled/Interrupted Messages

When a task is cancelled mid-stream, messages with `status: "generating"` get
stuck because the extension never sends an update. To diagnose:

1. In the webview DevTools, inspect the `messages` array in the chat component state
2. Look for messages where `text` parses to `{status: "generating"}`
3. Check `lastModifiedMessage.ask` — if it is `"resume_task"`, the task was cancelled

See `CLAUDE.md → ChatRow Cancelled/Interrupted States` for the full pattern.

## Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| Webview shows blank panel | Build not compiled | Run `npm run compile` |
| Messages not updating | Hot-reload not active | Reload Extension Host |
| DevTools won't open | Webview not focused | Click into the Cline panel first |
| React DevTools missing | Extension not installed | Install in that DevTools window |
| gRPC call has no effect | Proto not regenerated | Run `npm run protos` |

## Reload Extension During Development

After making changes to the extension host code:

```
Cmd+Shift+P → Developer: Reload Extension Host
```

For webview changes only (`webview-ui/src/`):

```bash
# In one terminal: watch mode
npm run watch:webview

# Then in VS Code: Reload Window is enough
Cmd+Shift+P → Developer: Reload Window
```
