# LudoX Monorepo

Realtime multiplayer Ludo implementation with a Node.js backend and React + Vite frontend.

## What is implemented

This repository currently delivers the PRD MVP foundation:

- **Server-authoritative game engine** (`src/engine/ludoEngine.js`)
- **Room lifecycle + realtime multiplayer events** over Socket.IO (`src/server.js`, `src/rooms/roomStore.js`)
- **Replay API** backed by ordered event logs (`/api/replay/:roomId`, `src/events/eventLogStore.js`)
- **Frontend client** for room create/join, start game, roll/move controls, and replay timeline (`frontend/src`)

## Repository structure

- `src/` – backend (Express + Socket.IO + Ludo engine + room/event stores)
- `test/` – backend tests (Vitest + Supertest)
- `frontend/` – React + TypeScript + Vite client

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

Install dependencies for both backend and frontend:

```bash
npm run bootstrap
```

If preferred, manual install is equivalent:

```bash
npm install
npm --prefix frontend install
```

## Run locally

Backend (port `3000` by default):

```bash
npm run dev:backend
```

Frontend (Vite dev server, defaults to `5173`):

```bash
npm run dev:frontend
```

The frontend expects backend endpoints at `http://localhost:3000` unless overridden via:

- `VITE_SOCKET_URL`
- `VITE_API_BASE_URL`

## Root scripts

- `npm run dev:backend` – run backend with watch mode
- `npm run dev:frontend` – run frontend dev server
- `npm run build` – backend syntax checks + frontend production build
- `npm run lint` – frontend ESLint
- `npm test` – backend + frontend test suites

## API endpoints

- `GET /health` – service health check
- `GET /api/replay/:roomId` – ordered room event log for replay UI

## Architecture overview (aligned to PRD)

Current architecture follows core PRD patterns for MVP:

1. **Realtime transport**: Socket.IO channels for room/game actions and broadcasts.
2. **Authoritative domain logic**: Backend `LudoEngine` enforces turn order, dice/move validity, and win conditions.
3. **Event capture for replay**: Every significant room/game action is appended to `EventLogStore` with sequence + timestamp.
4. **Replay consumption**: Frontend fetches replay events through REST API and renders timeline playback data.
5. **Room isolation**: `RoomStore` keeps game state and deduped action IDs per room.

Future PRD items like durable queues, persistent databases, matchmaking service, and leaderboard service are not yet implemented in this codebase.
