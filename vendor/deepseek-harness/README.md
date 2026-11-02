# Headless Harness extraction

Source: https://github.com/ddonofrio/deepseek-harness
Revision: `29672527891b62245a73a4e2745d6274325100bf`.

- `json-schema.ts`: complete enforced schema validator from `packages/core/tools/src/json-schema.ts`; imports use local compatibility primitives. RvR adds validated string `minLength` and `maxLength` constraints with Unicode code-point counting.
- `loop-detector.ts`: pure detection/tokenization functions from `packages/core/agent-loop/src/loop-detector.ts`; stream adapters and their type-only imports omitted.
- `compat.ts`: local replacements for the validator's three small external primitives.

MIT license retained. RvR uses these files at runtime. World tools also expose the pinned Harness `ToolDefinition` shape through `server/agents/harness-plugin.ts`. The full Harness lifecycle, MCP loading, and frontend are not bundled.

