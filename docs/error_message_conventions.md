# Error Message Conventions

Consistent error messages make it easier for users and contributors to
diagnose and resolve issues. Follow these conventions when writing new
error messages in the Cline extension.

---

## Structure

Error messages should be:

1. **Specific**: include the operation that failed and, where possible, the
   reason.
2. **Actionable**: tell the user what they can do to fix the problem.
3. **Concise**: one or two sentences.

```typescript
// Good
throw new Error(
  `Failed to read file '${filePath}': ${err.message}. ` +
  `Check that the file exists and the extension has read permissions.`
)

// Too vague
throw new Error("File read error")

// Too verbose (implementation details the user cannot act on)
throw new Error(
  `Error in FileSystem.readFile() at line 42: ENOENT no such file or ` +
  `directory, open '${filePath}' (syscall: open, path: ${filePath}, ` +
  `errno: -2, code: ENOENT)`
)
```

---

## Prefix pattern

All operational errors should begin with **"Failed to"** followed by the
operation verb:

| Operation | Prefix |
|-----------|--------|
| Reading a file | `Failed to read file 'X'` |
| Writing a file | `Failed to write file 'X'` |
| Executing a command | `Failed to execute command 'X'` |
| Connecting to an API | `Failed to connect to 'X'` |
| Parsing configuration | `Failed to parse configuration: X` |

---

## User-facing vs. internal errors

Some errors are shown directly in the Cline chat UI. These should avoid
technical jargon and link to documentation where possible:

```typescript
// Shown in the chat UI
const userMessage =
  "API key authentication failed. Please check your API key in settings " +
  "(Cline > Settings > API Provider)."

// Internal log (can contain technical details)
logger.error("Authentication failed", { statusCode: 401, provider, endpoint })
```
