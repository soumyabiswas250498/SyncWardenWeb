# SyncWarden Web

Frontend for SyncWarden, a self-hosted cross-device sync app. Talks to the `backend/` Express API for auth and (eventually) device/signaling, and will own all WebRTC peer-to-peer file transfer logic directly in the browser.

## Stack

- React 19 + TypeScript + Vite (`@vitejs/plugin-react-swc`)
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- React Router v7 (data router, lazy-loaded routes)
- TanStack Query v5 for server state
- react-hook-form + zod for forms/validation
- Axios for REST calls, with automatic access-token refresh
- Zustand for client state (auth session)
- socket.io-client for realtime device presence / WebRTC signaling
- Native WebRTC (`RTCPeerConnection` + `RTCDataChannel`) for P2P file transfer
- Vitest + React Testing Library + MSW for unit/component tests
- Playwright for e2e tests

See [AGENTS.md](./AGENTS.md) for the project's folder-structure and coding conventions.

## Getting started

```bash
nvm use            # Node 20+
cp .env.example .env
npm install
npm run dev
```

The dev server runs on **port 3000** by default (`vite.config.ts`), matching the backend's `CORS_ORIGIN=http://localhost:3000`. If your local `backend/.env` uses a different `PORT`, update `VITE_API_BASE_URL` in `.env` to match.

To exercise the wired login flow end-to-end, also run the backend:

```bash
cd ../backend
npm install
cp .env.example .env
npm run dev
```

## Environment variables

| Variable            | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `VITE_API_BASE_URL` | REST API base URL, including `/api/v1`                            |
| `VITE_WS_URL`       | Socket.IO signaling endpoint (backend doesn't implement this yet) |

## Scripts

| Script                            | Description                                                   |
| --------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                     | Start the Vite dev server on port 3000                        |
| `npm run build`                   | Typecheck (`tsc -b`) and build for production                 |
| `npm run preview`                 | Preview the production build locally                          |
| `npm run typecheck`               | Typecheck without emitting                                    |
| `npm run lint`                    | Run ESLint                                                    |
| `npm run format` / `format:check` | Prettier write / check                                        |
| `npm run test`                    | Run unit/component tests once (Vitest)                        |
| `npm run test:watch`              | Run unit/component tests in watch mode                        |
| `npm run test:coverage`           | Run unit/component tests with coverage                        |
| `npm run test:e2e`                | Run Playwright e2e tests (boots the dev server automatically) |

## Project structure

```txt
src/
├── routes/         # router tree, layout, ProtectedRoute
├── pages/          # route-level pages
├── features/       # feature modules (api, schemas, store, components)
├── components/ui/  # shadcn/ui components (generated -- don't hand-edit)
├── lib/            # axios client, query client, shared helpers
├── realtime/       # Socket.IO signaling client + event types
├── webrtc/         # RTCPeerConnection + DataChannel file-transfer utilities
├── mocks/          # MSW request handlers
└── test/           # test setup + shared test utilities
```

## Current scope

This scaffold wires a real login flow against the backend's `/api/v1/auth/login`, with token storage, auto-refresh, and a protected `/dashboard` route. Registration, OTP verification, forgot-password, device management, and the realtime/WebRTC modules are structural placeholders -- the backend doesn't implement those endpoints yet (see `backend/README.md` and `AGENTS.md` for the planned build order).

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component-name>
```

Generated files land in `src/components/ui/`.
