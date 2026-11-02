# Architecture

RvR is one persistent world, not a collection of selectable game modes. The process boundary is the primary design boundary.

```text
Browser clients (0..20)
  | SSE snapshots and authoritative frames
  v
Server transport -> World runtime
                    |-- Turn clock
                    |-- Simulation engine
                    |-- Agent runtime -> model providers
                    `-- SQLite store -> replay/export
                            |
                            v
                World definition + generator + content
```

Players exist in the domain as non-physical commanders. A commander may own or be assigned many robots, but is never rendered, spawned, collided, or stored as an `Entity`. The prototype order transport is restricted to administrative or loopback callers; commander-facing transport must verify robot ownership before an order reaches the simulation engine.

## Ownership rules

- The server owns ticks, entity state, voxel mutations, inventory, actions, sessions, and history.
- A client owns presentation state such as camera position, selected UI panel, and replay cursor.
- A generator owns deterministic terrain lookup and spawn height.
- The world definition owns RvR-specific entities, rules, automata, and manifest values.
- Content modules own declarative mineral and vehicle definitions.
- The engine owns reusable physics and action validation; it must not import a specific generator, mineral, vehicle, or UI.

## Continuous simulation

`WorldRuntime` enables `TurnClock` during construction. The server pumps it independently of SSE subscribers. Disconnecting the final client does not affect the clock, automata, agents, persistence, or event stream.

The simulation now owns capability-driven robot order queues and their deterministic execution. Commander authentication, fleet assignment, ownership transfer, hostile combat semantics, and vehicle control remain future gameplay decisions. The architecture reserves a 20-commander scale target without inventing those mechanics prematurely.

The clock uses wall time only to pace fixed simulation steps. A committed agent turn completes its one-second physics window even if an administrator pauses immediately afterward.

## Scale boundaries

The current server enforces 20 sessions, but transport is intentionally simple. Before adding large entity counts or view distances, add chunk interest management and delta compression. Keep the public contracts in `src/shared/protocol.ts` so transport can move from HTTP/SSE to WebSocket without coupling game rules to sockets.

## World generation

Every generator implements `WorldGenerator`:

- `id` and `description` identify it in configuration and metadata.
- `terrain` optionally supplies sparse procedural voxel lookup.
- `spawn(seed, x, z)` resolves safe world coordinates.
- `initialBlocks()` is reserved for finite generated structures.

`empty` and `flat` are intentionally minimal foundations. `noise` is the production generator and composes ore data from the mineral registry. Add a new generator as its own module and register it in `src/world/generation/index.ts`.

## Persistence

SQLite stores compressed frames, checkpoints, events, agent state, pending decisions, and inference audit records. The manifest is recorded with the world; incompatible generator or material changes require a new data directory or explicit reset. Replay reconstructs state only from checkpoints and frames.

