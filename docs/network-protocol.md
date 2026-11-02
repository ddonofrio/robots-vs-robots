# Network protocol

The current protocol is an observer/control transport around one authoritative world. A player is a non-physical commander, not an entity or avatar. Commander login and fleet assignment are not implemented yet; the loopback/admin prototype can issue orders to the current miner fleet.

## Live world

- `GET /api/stream` opens an SSE stream. `boot` contains a snapshot; `frame` contains authoritative deltas; `status` carries clock state.
- `GET /api/state?tick=N` loads a historical snapshot.
- `GET /api/frames?tick=N` loads later recorded frames.
- `GET /api/events` exposes recorded observer events.
- `GET /api/export` streams an NDJSON recording.
- Administrative prototype controls remain loopback-only unless `ADMIN_TOKEN` is configured.
- `POST /api/orders` queues a validated `move`, `patrol`, `search`, `mine`, `defend`, or `repair` order for selected entity IDs.
- `POST /api/orders/cancel` removes one queued order batch. Cancelling an active batch stops its current motion before the next queued order starts.
- Order queues, progress, mineral reports, and repair state live in authoritative entity snapshots and recorded frames. The browser only submits intent and renders them.

## Twenty-player target

`MAX_PLAYERS` in `src/shared/protocol.ts` records a maximum of 20 commanders. Before multiplayer behavior is implemented, RvR still needs explicit decisions for:

- commander identity, authentication, and reconnection;
- robot models and how robots join or leave a commander's fleet;
- ownership and assignment transitions;
- assigning authenticated ownership before accepting selection and orders outside the administrative prototype;
- connection, authentication, reconnection, spawning, and despawning rules;
- chunk subscriptions and interest management;
- conflict resolution for simultaneous commands.

The invariant is already fixed: commanders are non-physical and each may control many robots. None of the remaining choices are inferred by the current code.
