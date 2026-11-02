# Agent runtime

Robot agents are embodied server-side actors. They use the same simulation and validation boundary as players; inference never receives a privileged observer snapshot.

## Turn contract

One logical turn represents one world second. The server collects decisions behind a barrier, retains completed decisions while other requests are pending, validates all actions at commit, and advances fixed physics steps. Provider latency does not advance world time.

Provider failures are retried or routed according to the configured strategy. If no model is available, an agent waits; the runtime must not invent a substitute action. A deterministic scripted mode exists only behind the explicit `SCRIPTED_DEMO=true` flag.

## Context and memory

Each request contains current local perception, applicable tools, learned facts, recent action outcomes, project state, and bounded private notes. Perception respects range, field of view, occlusion, and interaction reach. Private notes and inference audit payloads stay server-side.

Agents maintain their own direction, project, immediate task, success condition, and assessment. The server validates physical facts, but it does not assign a fixed objective catalog or declare subjective project success on the agent's behalf.

## Durability and replay

Prepared decisions are staged durably before commit. A restart cancels interrupted inference records, resumes the last checkpoint, and reissues only unfinished work. Replay consumes recorded frames and events and never calls a model.

## Extension rules

- Add tools in `server/agents/tools.ts` and bind them to the server-selected entity ID.
- Keep provider credentials and raw diagnostics outside browser responses and world events.
- Add focused contract tests for tool schemas, action references, decision normalization, provider fallback, planning, and compaction.
- Vehicle-specific agent tools should translate intent into ordinary authoritative engine actions; they must not bypass vehicle physics.

