# Robots vs Robots (RvR)

RvR is a persistent voxel game with an authoritative server and a browser client. The server owns the world, simulation clock, robot agents, persistence, and replay. Clients connect and receive the live world stream. The world continues to run when every client disconnects.

## Current foundation

- Deterministic infinite noise terrain with mountains, dunes, rivers, bedrock, and clustered minerals.
- Pluggable `noise`, `flat`, and `empty` world generators.
- Server-authoritative movement, actions, physics, world events, and SQLite recording.
- Domain boundary for up to 20 non-physical commanders, each controlling a future fleet of robots. Robot models and command semantics remain intentionally unimplemented.
- Server-sent live frames plus historical replay and NDJSON export.
- Modular mineral and vehicle registries ready for new content.
- Embodied-agent runtime with local perception, tools, planning, bounded memory, provider fallback, decision barriers, and inference audit.
- Three robot constructions and powered variants retained as the initial playable/prototyping roster.
- Authoritative queued miner orders for movement, patrol, cooperative mineral search, scanning, mining, defense, and repair, with recorded progress and cancellation.

## Requirements

- Node.js 24 or newer.
- A browser with WebGL.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://127.0.0.1:3000`. The world starts immediately with the server. Opening or closing the browser does not control world lifetime.

Production build:

```powershell
npm run build
npm start
```

Quality checks:

```powershell
npm run check
npm test
```

## Configuration

The main environment settings are:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Server bind address. Use `0.0.0.0` only behind appropriate network controls. |
| `PORT` | `3000` | HTTP port. |
| `DATA_DIR` | `data` | SQLite world recording directory. |
| `WORLD_GENERATOR` | `noise` | `noise`, `flat`, or `empty`. |
| `ADMIN_TOKEN` | empty | Secret for remote admin requests; without it, admin controls are loopback-only. |
| `AGENT_MAX_TURNS` | unlimited | Optional positive agent decision limit. |
| `SCRIPTED_DEMO` | `false` | Explicit deterministic agent demo mode. |

LLM providers are optional and configured server-side through the variables in `.env.example`. Provider keys never go to the browser.

## Project map

```text
server/                       authoritative process
  agents/                     inference, planning, memory and tools
  index.ts                    HTTP/SSE API and server lifecycle
  store.ts                    durable frames, events and agent state
  turn-clock.ts               deterministic decision/physics barrier
  world-runtime.ts            composition root for one persistent world
src/
  core/                       simulation and voxel primitives
  shared/protocol.ts          client/server contracts and limits
  view/                       Three.js renderer
  world/
    content/                  minerals and vehicles
    commanders.ts            commander-to-robot ownership contract
    generation/               empty, flat, noise, registry and contracts
    definition.ts             RvR rules, robots and initial state
  world-app.ts                browser client
tests/                        engine, agent, persistence and architecture tests
vendor/                       pinned third-party agent harness core
```

See [architecture](docs/architecture.md), [network protocol](docs/network-protocol.md), and [agent runtime](docs/agent-runtime.md) for the design contracts.

## Reset the world

Resetting deletes the active recording. Stop the server first, then run:

```powershell
.\scripts\worlds\reset.ps1
```

Alternatively use the explicit reset control in the client. A reset is intentionally destructive.

## Near-term roadmap

1. Replace the current SSE/HTTP command transport with a binary WebSocket channel while retaining the shared protocol boundary.
2. Add chunk subscriptions and per-player interest management instead of broadcasting full dynamic frames.
3. Move players into drivable vehicles and implement authoritative vehicle physics.
4. Add recipes, mining progression, ownership, teams, combat, and server administration.
5. Add account-backed session recovery, rate limiting, TLS termination guidance, and load tests for 20 clients.

