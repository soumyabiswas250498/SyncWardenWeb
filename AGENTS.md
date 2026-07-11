# AGENTS.md — SyncWarden Web Coding Rules

## Purpose of This File

This file defines the rules to follow while writing code for `syncwarden-web`, the frontend for the SyncWarden self-hosted cross-device sync app.

This repository is not a monorepo. Do not create `apps/`, `packages/`, `syncwarden-server`, or `syncwarden-mobile` inside this repository.

---

## Repository Boundary

Allowed:

- React/Vite application code
- REST API calls to the backend (`syncwarden-server`, `/api/v1/*`)
- Socket.IO client for device presence and WebRTC signaling
- WebRTC PeerConnection / DataChannel logic for peer-to-peer file transfer
- Client-side state, routing, forms, and UI
- Frontend tests (unit, component, e2e)

Not allowed:

- Express/Node backend code
- MongoDB/Mongoose models
- JWT signing or password hashing (the backend owns auth issuance; this app only stores and sends tokens it receives)
- Backend-side Socket.IO server code
- TURN/STUN relay server implementation

If a feature belongs to the backend, do not implement it here.

---

## Important Product Rule

SyncWarden has three connectivity modes:

```txt
Red    = device offline
Yellow = device online, but direct WebRTC/local transfer unavailable (backend relays signaling only)
Green  = device online and direct WebRTC peer-to-peer transfer available
```

For Green Mode:

- File chunks must flow only through the RTCDataChannel between peers (see `src/webrtc/`).
- File chunks must never be sent through the REST API or the Socket.IO connection.
- The backend is signaling-only: it forwards `signal:send`/`signal:receive` events, nothing more.

---

## Auth Rules

- The backend issues JWT access + refresh tokens as JSON in the response body (not cookies). Store them via `useAuthStore` (`src/features/auth/store/auth-store.ts`), not ad hoc `localStorage` calls.
- All authenticated REST calls go through the shared `api` axios instance (`src/lib/axios.ts`), which attaches the bearer token and handles 401 → refresh-token transparently. Do not create a second axios instance for authenticated calls.
- Never log tokens or persist them anywhere other than the auth store.

---

## Folder Structure

```txt
src/
├── main.tsx, vite-env.d.ts
├── routes/           # router tree, layouts, ProtectedRoute
├── pages/             # route-level page components
├── features/
│   └── <feature>/
│       ├── api/        # axios calls + react-query hooks
│       ├── schemas/    # zod schemas
│       ├── store/       # zustand stores (if the feature owns client state)
│       ├── components/  # feature-specific components
│       └── types.ts
├── components/ui/     # shadcn/ui generated components -- do not hand-edit; regenerate via `npx shadcn add <name>`
├── lib/                # axios client, query client, cn(), shared helpers
├── realtime/           # Socket.IO signaling client + event contracts
├── webrtc/             # RTCPeerConnection + DataChannel file-transfer utilities
├── mocks/              # MSW handlers (tests + optional dev mocking)
└── test/               # test setup and shared test utilities
```

New features get their own folder under `src/features/<feature>/` following the `auth` feature's shape. Keep API calls, schemas, and state colocated with the feature that owns them; only promote something to `src/lib` or `src/components/ui` once a second feature needs it.

---

## API Prefix Rule

All REST calls target `${VITE_API_BASE_URL}` which already includes `/api/v1`. Do not hardcode `http://localhost:...` in feature code -- always go through `src/lib/axios.ts`.

---

## Code Style Rules

- Use TypeScript strictly. Avoid `any` unless absolutely necessary.
- Prefer explicit types for API request/response payloads and socket event payloads.
- Keep components focused on rendering; put data fetching in `api/` hooks and validation in `schemas/`.
- Path-alias imports (`@/...`) over deep relative imports (`../../../`).
- Every new feature that talks to the network needs: a zod schema (if it takes user input), an api function, and a react-query hook. Follow the pattern in `src/features/auth/`.

---

## Testing Rules

- Component/unit tests: Vitest + React Testing Library, with MSW mocking any network calls (see `src/mocks/handlers.ts`). Do not hit the real backend in unit tests.
- E2E tests (Playwright, `e2e/`) run against a real dev server and may exercise the real backend when relevant, but should not assume a specific seeded backend state unless the spec sets it up itself.

---

## Development Order

Follow this order when building out new feature areas (mirrors the backend's build order):

```txt
1. Auth (done: login wired; register/OTP/forgot-password/reset are not yet built)
2. Device list / device management UI (once backend device endpoints exist)
3. Realtime device presence (src/realtime/) wired to actual UI
4. Green-mode P2P file transfer UI (src/webrtc/) wired to actual UI
5. Yellow-mode relayed transfer UI (once backend supports it)
```

Do not jump ahead to transfer UI polish before the underlying backend endpoints exist -- check `backend/README.md` for what's actually implemented.
