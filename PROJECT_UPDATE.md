# SyncWarden Web — Project Update

**Status date:** 14 July 2026  
**Repository:** `syncwarden-web` frontend

## Executive summary

The web frontend now covers the main authenticated browser workflow: account access, browser-device registration, device management, presence, and text sharing between a user's devices. The current in-progress work adds a responsive Messages experience backed by REST history and a resilient authenticated WebSocket connection.

The application builds successfully and passes lint. All 45 unit/component tests pass, although the test command remains red because overall coverage is below the configured 95% threshold. Green-mode peer-to-peer file transfer is not yet exposed in the UI; only the lower-level WebRTC utilities exist.

## Delivered

### Authentication and session management

- Sign in, sign up, OTP verification, forgot-password, and password-reset flows.
- Access and refresh token storage through the shared Zustand auth store.
- Shared Axios client with bearer authentication and automatic token refresh.
- Protected routes and session bootstrap behavior.

### Device identity and management

- Browser-device registration with a locally generated device key.
- DPoP proofs for device-bound API requests.
- Device list, rename/icon update, revoke, heartbeat, expiry, and status UI.
- IndexedDB-backed device identity persistence.
- Route guard that requires device registration after authentication.

### Realtime presence and text sharing

- Authenticated native WebSocket client using single-use tickets.
- Reconnect backoff, offline handling, terminal close-code handling, and session cleanup.
- Live device-presence updates using the red/yellow/green status model.
- Text-share create, history, pagination, pending-delivery catch-up, acknowledgement, deduplication, and deletion support.
- Responsive Messages screen with device conversations, unread state, delivery state, search, and mobile navigation.
- Text payload enforcement at the backend-aligned 100,000-byte limit.

### Foundations

- React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Zustand, and MSW.
- Lazy-loaded route-level pages.
- Vitest/React Testing Library unit and component tests plus Playwright smoke tests.
- WebRTC peer-connection and RTCDataChannel file-transfer utilities with chunking and backpressure.

## In progress

- The Messages/shares feature and WebSocket migration are present in the working tree but are not yet committed to `main`.
- App-shell navigation and responsive full-height Messages layout are being integrated with realtime connection state.
- Mock handlers and tests are being extended for shares and WebSocket behavior.

## Quality snapshot

| Check                     | Result                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Production build          | Pass                                                               |
| ESLint                    | Pass                                                               |
| Unit/component assertions | 45/45 pass across 11 test files                                    |
| Coverage                  | 64.28% lines, 62.45% statements, 44.14% branches, 65.30% functions |
| Coverage gate             | Fail — configured global threshold is 95%                          |
| Prettier check            | Fail — 30 files currently reported                                 |
| Playwright smoke coverage | Two unauthenticated login/validation scenarios                     |

## Known gaps and risks

1. Realtime code has limited automated coverage; `ws-client.ts` is the largest coverage gap.
2. The new Messages UI needs broader component coverage and end-to-end validation against the backend.
3. Green-mode file transfer is not wired into product UI, and end-to-end WebRTC signaling/transfer is not verified.
4. Custom uploaded device icons are not rendered yet; the UI falls back to icon codes or platform defaults.
5. Formatting must be normalized or the check narrowed to exclude generated/design-reference files before it can be used as a reliable CI gate.
6. The README and environment documentation must stay aligned with the native WebSocket ticket flow; the client now derives the WebSocket URL from `VITE_API_BASE_URL`.

## Recommended next milestone

Stabilize and merge realtime text sharing before moving into file-transfer UI:

1. Add focused tests for WebSocket lifecycle, message handling, reconnect behavior, and Messages components.
2. Raise coverage to the agreed CI target, or revise the 95% threshold to a staged target with ratcheting.
3. Resolve Prettier failures and run the Playwright smoke suite.
4. Verify text sharing, acknowledgements, presence changes, and device revocation against the real backend.
5. Commit the Messages/realtime work as one reviewed milestone.
6. Then wire Green-mode WebRTC signaling and RTCDataChannel file transfer into the UI, keeping file chunks off REST and WebSocket transports.
