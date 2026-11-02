# Robots vs Robots (RvR)

Read `README.md` and `docs/architecture.md` before changing runtime boundaries, persistence, networking, or world generation.

- Write source, comments, UI text, documentation, and agent instructions in English. Keep player-facing names translatable.
- The server is authoritative. Clients submit intent and render snapshots; they never mutate or advance world state locally.
- The world starts with the server and keeps advancing without connected clients. Client connect/disconnect events must not pause the clock.
- A player is a non-physical commander who controls many robots. Never create a player avatar or player robot. Design for at most 20 commanders; robot models, assignment, ownership transitions, and order semantics remain separate future work.
- Keep simulation, networking, persistence, agent inference, rendering, content catalogs, and generators independent.
- Add world generators under `src/world/generation/` and register them in its index. A generator owns terrain generation and spawn placement, not game rules.
- Add minerals and vehicles through the data registries under `src/world/content/`. Do not hard-code a growing catalog into the engine or transport.
- Keep the server simulation deterministic. Random world data must derive from the world seed; wall-clock time may pace frames but must not change outcomes.
- A shared agent turn collects decisions and commits exactly one world second. Model latency never consumes world time.
- Model unavailability is an indefinite, cancellable wait for agent-controlled actors. Do not fabricate a decision.
- Agents receive local, occlusion-aware observations, bounded memory, and explicit action results. Never expose observer state, provider credentials, or other agents' private memory.
- Agents choose goals and success conditions. Keep physical validation separate from their assessment of progress.
- Persist authoritative frames and events. Replay reads recorded history and never repeats inference or decision logic.
- Saved data lives under `data/`. Never delete a world unless the user explicitly requests a reset or the reset endpoint/script is deliberately invoked.
- Preserve secrets server-side. `.env`, provider keys, session tokens, and private inference traces must never enter browser payloads or recordings.
- Prefer small modules and focused tests for invariants. Run `npm run check`, `npm test`, and `npm run build` before handoff when dependencies are available.
- Do not start or stop the user's long-running server unless explicitly requested. Offline checks and short-lived test processes are allowed.

