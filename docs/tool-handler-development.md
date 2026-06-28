# Tool Handler Development Guide

This guide explains how to add a new tool to Cline's agent loop, covering
the full stack from proto definition to UI rendering.

## Overview

Cline's tool system has five layers:

1. **System prompt** (`src/core/prompts/system-prompt/tools/`) — describes
   the tool to the LLM in XML format.
2. **Tool executor** (`src/core/task/tools/handlers/`) — Node.js handler that
   actually executes the tool when the LLM invokes it.
3. **gRPC proto** (`proto/cline/`) — message types for streaming progress
   back to the webview.
4. **Webview UI** (`webview-ui/src/components/chat/`) — renders the tool's
   progress and result in the chat panel.
5. **Variant configs** (`src/core/prompts/system-prompt/variants/*/config.ts`)
   — registers the tool with each model family.

---

## Step 1: Define the Tool Spec

Create `src/core/prompts/system-prompt/tools/my_tool.ts`:

```typescript
import { ModelFamily, ToolVariant } from '../types';

const GENERIC: ToolVariant = {
  modelFamily: ModelFamily.GENERIC,
  spec: `<tool_description>
<tool_name>my_tool</tool_name>
<description>
Perform the specific action this tool does. Be precise about what it does
and does not do. The LLM uses this description to decide when to call it.
</description>
<parameters>
<parameter>
<name>target</name>
<type>string</type>
<description>The target resource identifier for the operation.</description>
<required>true</required>
</parameter>
<parameter>
<name>dry_run</name>
<type>boolean</type>
<description>If true, simulate the operation without making changes.</description>
<required>false</required>
</parameter>
</parameters>
</tool_description>`,
};

export const my_tool_variants: ToolVariant[] = [GENERIC];
```

---

## Step 2: Register in `init.ts`

Add to `src/core/prompts/system-prompt/tools/init.ts`:

```typescript
import { my_tool_variants } from './my_tool';

export const allToolVariants: ToolVariant[] = [
  // ... existing tools
  ...my_tool_variants,
];
```

---

## Step 3: Add to Variant Configs

In each variant's `config.ts`, add `ClineDefaultTool.my_tool` to the
`.tools()` list:

```typescript
// src/core/prompts/system-prompt/variants/generic/config.ts
import { ClineDefaultTool } from '../../../../shared/tools';

export const genericConfig = VariantConfig.create()
  .tools([
    ClineDefaultTool.execute_command,
    // ... existing tools
    ClineDefaultTool.my_tool,  // add here
  ]);
```

Repeat for all variant configs: `next-gen`, `gpt-5`, `xs`, etc.

---

## Step 4: Implement the Handler

Create `src/core/task/tools/handlers/myToolHandler.ts`:

```typescript
import { ClineProvider } from '../../../webview/ClineProvider';
import { TaskState } from '../../taskState';

export async function handleMyTool(
  provider: ClineProvider,
  taskState: TaskState,
  params: {
    target: string;
    dry_run?: boolean;
  },
): Promise<string> {
  const { target, dry_run = false } = params;

  if (!target || target.trim() === '') {
    return 'Error: target parameter is required and must not be empty.';
  }

  // Check for task abort
  if (taskState.abort) {
    return 'Operation cancelled.';
  }

  if (dry_run) {
    return `Dry run: would perform operation on ${target}`;
  }

  // Real implementation here
  try {
    const result = await performOperation(target);
    return `Successfully completed operation on ${target}: ${result}`;
  } catch (error) {
    return `Error performing operation on ${target}: ${String(error)}`;
  }
}
```

---

## Step 5: Update Snapshots

After adding your tool to any variant config, regenerate snapshots:

```bash
UPDATE_SNAPSHOTS=true npm run test:unit
```

Commit the updated snapshot files. Failing to do this will cause CI to fail
with a snapshot mismatch error.

---

## Checklist

- [ ] Tool spec in `tools/my_tool.ts` with clear description and parameter docs
- [ ] Registered in `tools/init.ts`
- [ ] Added to ALL variant configs (generic, next-gen, gpt-5, xs, hermes, glm, …)
- [ ] Handler in `handlers/myToolHandler.ts` with abort check
- [ ] Snapshots regenerated: `UPDATE_SNAPSHOTS=true npm run test:unit`
- [ ] TypeScript compiles: `npm run compile`
- [ ] `ClineDefaultTool` enum updated in `src/shared/tools.ts`
- [ ] If the tool streams progress: proto message + ChatRow rendering added
