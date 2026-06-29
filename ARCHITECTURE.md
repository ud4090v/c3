# C3 — Command & Control Center

## What C3 Is

C3 is the **single pane of glass** for BlackRabbitGroup's AI agent org. It surfaces:

- **Agent roster and status** — who's online, who's busy, who's degraded (live data from OpenClaw sessions).
- **Task board** — every task created, assigned, in-progress, completed, failed. Department-aware routing.
- **Audit log** — every inter-agent message and tool invocation, queryable and paginated.
- **Notifications** — in-app alert system for high-priority events.
- **Analytics** — department throughput, agent leaderboards, health summary.
- **Vault browser** — read-only view of `/root/.openclaw/vault/` for live OpenClaw memory and notes.
- **Org chart** — visual hierarchy of departments → positions → agents.

C3 is **not** an agent orchestration engine. C3 is the **observability and operator UI** for an org that already runs through OpenClaw. Commands that need to mutate agent state go through the OpenClaw add-on (HMAC-signed HTTP), not C3.

---

## Architecture (post-productization, Phase 1+2)

```
                            ┌─────────────────────────────────┐
                            │  Vercel (Edge + Serverless)     │
                            │  ┌───────────────────────────┐  │
                            │  │  c3.blackrabbitgroup.org  │  │
                            │  │  ud4090v/c3 (Public UI)   │  │
                            │  │  Vite + React SPA         │  │
                            │  └─────────────┬─────────────┘  │
                            │                │ /api/* (rewrite)
                            │  ┌─────────────▼─────────────┐  │
                            │  │  Public API (Phase 2)     │  │
                            │  │  ud4090v/c3-api (TBD)     │  │
                            │  │  Stateless multi-tenant   │  │
                            │  └─────────────┬─────────────┘  │
                            └────────────────┼────────────────┘
                                             │ HTTPS + per-org API key (X-C3-Org-Id + HMAC)
                                             ▼
                            ┌─────────────────────────────────┐
                            │  SAXA box (or any OpenClaw box)│
                            │  ┌───────────────────────────┐  │
                            │  │  OpenClaw add-on          │  │
                            │  │  ud4090v/openclaw-c3-addon│  │
                            │  │  @openclaw/c3-addon       │  │
                            │  │  HMAC-verifying HTTP      │  │
                            │  │  on 127.0.0.1:52400       │  │
                            │  └─────────────┬─────────────┘  │
                            │                │ CLI + vault
                            │  ┌─────────────▼─────────────┐  │
                            │  │  OpenClaw CLI             │  │
                            │  │  + agent sessions         │  │
                            │  │  + vault + wiki           │  │
                            │  └───────────────────────────┘  │
                            └─────────────────────────────────┘
```

**Trust model:**
- **Public UI ↔ Public API:** same-origin via Vercel rewrites. Browser never sees the API key.
- **Public API ↔ add-on:** mTLS or HMAC over HTTPS (TBD Phase 2). Per-org API key in `X-C3-Org-Id` header.
- **Add-on ↔ OpenClaw:** loopback trust. Same box. Port 52400 binds to `127.0.0.1` only.

---

## The Three Repos (post-split, 2026-06-29)

| Repo | Purpose | Stack | Build target |
|---|---|---|---|
| **`ud4090v/c3`** | Public UI (this SPA) | Vite + React 18 + TypeScript + Tailwind + TanStack Query + Zustand + Socket.IO client + react-router | Vercel static |
| `ud4090v/c3-api` | Public API (Phase 2 of C3-56) | TBD — likely Fastify or Hono on Vercel Serverless | Vercel Serverless |
| `ud4090v/openclaw-c3-addon` | OpenClaw add-on | Fastify + pino + TypeScript ESM. Wraps OpenClaw CLI over HMAC-signed HTTP | Loopback only, per-box npm install |

The mono-repo `ud4090v/openclaw-c3` is **archived**. Its 6 commits (2026-06-25) represent the development history of the add-on and SPA together; that history is preserved.

---

## Public UI (`ud4090v/c3`) — Internal Layout

```
ud4090v/c3/
├── index.html                  # Vite entry
├── package.json                # root package, scripts: dev/build/preview/test
├── pnpm-workspace.yaml         # workspace = ['.', 'packages/*']
├── tsconfig.json               # path alias @c3/shared → ./packages/shared/src
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── public/                     # static assets served as-is
│   └── favicon.svg
├── src/
│   ├── main.tsx                # ReactDOM.createRoot mount point
│   ├── App.tsx                 # router + global providers (QueryClient, Zustand store)
│   ├── index.css               # Tailwind directives + custom CSS vars
│   ├── lib/
│   │   └── api.ts              # typed fetchJson wrapper + api.* facade
│   ├── hooks/
│   │   └── useRealtimeUpdates.ts  # Socket.IO subscription for live data
│   ├── components/
│   │   ├── AgentDirectory.tsx
│   │   ├── AgentDetail.tsx
│   │   ├── TaskBoard.tsx
│   │   ├── CreateTaskForm.tsx
│   │   ├── OrgChart.tsx
│   │   ├── AuditLog.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── Analytics.tsx
│   │   ├── DataFreshness.tsx
│   │   ├── HealthBar.tsx
│   │   ├── VaultBrowser.tsx
│   │   └── StatusBadge.tsx
│   └── (no src/shared/ — moved to packages/shared/src/)
└── packages/
    └── shared/
        ├── package.json        # @c3/shared, type: module, main: ./src/index.ts
        ├── tsconfig.json
        └── src/
            └── index.ts        # 162 lines — Agent, Task, Audit, Notification,
                                #   OrgChart, Analytics, Health types
```

### Data flow

1. **Components** call the typed `api.*` facade in `src/lib/api.ts`.
2. `api.*` calls `fetchJson('/path')` which prepends `API_BASE = '/api'`.
3. Vercel rewrites `/api/*` → `https://api.blckrbbt.io/{same-path}` (today) OR `https://c3-api.vercel.app/{same-path}` (Phase 2 of C3-56).
4. Public API verifies per-org HMAC, then proxies to the per-box add-on over loopback / tunnel.
5. Add-on verifies inbound HMAC, executes the OpenClaw CLI call, returns typed JSON.
6. TanStack Query handles caching, invalidation, retries on the client.
7. Socket.IO subscription (`useRealtimeUpdates`) gets pushed events from the API for live updates without polling.

### Why these specific choices

| Choice | Why |
|---|---|
| **Vite + React 18 + TS** | Fast dev loop, mature ecosystem, Vercel-native build target. |
| **TanStack Query** | Handles server-state caching, dedup, retries, invalidation — vastly simpler than Redux for this use case. |
| **Zustand** | Lightweight client-state for UI-only state (sidebar collapsed, current filter). No provider hell. |
| **Socket.IO client** | Real-time push from API. Falls back to polling if socket disconnects. |
| **`@c3/shared` in-repo** | Single source of truth for types, no publishing to npm, no version drift between client and server. |
| **Tailwind** | Utility-first. Fast to iterate on the dashboards/tables. |
| **`API_BASE = '/api'`** | Same-origin via Vercel rewrites — browser never needs to know the API host. |

---

## Add-on (`ud4090v/openclaw-c3-addon`) — Internal Layout

```
ud4090v/openclaw-c3-addon/
├── package.json        # @openclaw/c3-addon, type: module, bin: c3-addon
├── tsconfig.json
├── README.md           # migration notes + Phase 1-4 commit history
└── src/
    ├── index.ts        # bootstrap
    ├── server.ts       # Fastify app, routes registered, CORS locked
    ├── config.ts       # reads C3_ADDON_SECRET_FILE, org_id, port
    ├── adapter.ts      # OpenClaw CLI invocation + response shaping
    ├── auth/           # HMAC verify/sign helpers
    ├── routes/         # /openclaw/agents, /openclaw/config, /openclaw/messages, etc.
    └── types.ts        # addon-side request/response types
```

### Trust model (loopback + HMAC)

- Listens on `127.0.0.1:52400` ONLY. No public port. No DNS record needed.
- Inbound requests: HMAC-SHA256 over the request body + canonical headers, signed with `C3_ADDON_SECRET`. Verified against the same shared secret on both sides.
- Outbound to OpenClaw CLI: subprocess invocation, return stdout parsed as JSON.
- No persistent state. Every request is a fresh CLI call.
- The secret lives in `/root/.openclaw/c3-addon/server-secret` on the box, loaded via `C3_ADDON_SECRET_FILE` env var on the **caller** (c3-server.service) — never logged, never sent in plaintext.

---

## Phase Plan & Status (C3-55)

| Phase | What | Status |
|---|---|---|
| A | `ud4090v/c3` builds clean from a fresh clone | ✅ Done 2026-06-29 (commit `a0c360e`) |
| B | Create Vercel project linked to `ud4090v/c3`, configure build + env | ⏳ Next |
| C | Configure Vercel rewrites `/api/*` → `https://api.blckrbbt.io` (today) or Phase 2 API | Pending |
| D | Promote Vercel deployment; point `c3.blackrabbitgroup.org` (or chosen domain) at it | Pending |
| E | Tear down `:3002/:3004` + `c3-client.service` at same moment as Vercel promotion. **No rollback seatbelt.** | Pending |

## Phase Plan & Status (C3-56 — Phase 2 of productization)

| Phase | What | Status |
|---|---|---|
| 1 | Decide runtime: Vercel Serverless vs separate Node service on Fly.io/Railway | Open |
| 2 | Design `ud4090v/c3-api` repo skeleton (Fastify or Hono, OpenAPI spec, per-org auth middleware) | Open |
| 3 | Migrate `c3-server.service` Express logic into the new repo (drop mono-repo patterns) | Open |
| 4 | Wire SPA to public API; cut Vercel rewrite target from `api.blckrbbt.io` → Vercel API | Open |
| 5 | Decommission SAXA-side `c3-server.service`; only `c3-addon.service` remains on the box | Open |

---

## Open Decisions Surfaced (C3-55 cleanup #2, 2026-06-29 09:05 EDT)

1. **GitHub repo name** — `ud4090v/c3` (current). Alternative: `ud4090v/c3-public-ui`. Decision: keep `ud4090v/c3` short.
2. **Vercel project name** — TBD. Default suggestion: `c3-public-ui` matching the eventual Phase 2 naming.
3. **Custom domain** — TBD. `c3.blackrabbitgroup.org` is the working assumption. Confirm with Cormac before D.
4. **C1 vs wait-for-C2** — C1 = Vercel rewrite `/api/*` → `api.blckrbbt.io` (today, calls SAXA via tunnel). C2 = Vercel rewrite → Vercel-side public API (Phase 2 of C3-56). Recommend C1 for D, swap to C2 when c3-api is ready.
5. **API key model** — Per-org `X-C3-Org-Id` header + HMAC body signature. Keys generated server-side, customer-issued. No cookie auth. No JWT.

---

## Quick Up-To-Speed (read this if you've lost context)

1. **What we have:** three repos (`ud4090v/c3`, `ud4090v/openclaw-c3-addon`, future `ud4090v/c3-api`). Mono-repo is archived.
2. **What's running today:** `c3-server.service` + `c3-addon.service` + `c3-client.service` on SAXA, all bound to loopback. Tunnel `c3-prod` (Cloudflare) exposes `api.blckrbbt.io` (c3-server) and `add-on.blckrbbt.io` (c3-addon). Done in SER-328.
3. **What's next:** Phase B (Vercel project), then C (rewrites), then D (cutover), then E (teardown). No rollback seatbelt at E per Cormac.
4. **Architectural invariants:**
   - Public UI must talk to `/api/*` same-origin only. Never to absolute URLs.
   - Loopback trust for add-on ↔ OpenClaw. Never expose 52400 publicly.
   - HMAC body signing for any cross-trust-boundary call. Shared secret in `C3_ADDON_SECRET_FILE`.
   - `@c3/shared` is the only shared code between UI and API. In-repo for now. Single source of truth.
5. **Where to look in Plane:** C3 project → issues C3-52, C3-54, C3-55, C3-56. SER-328 in infrastructure workspace for the networking baseline.
6. **Lessons learned:**
   - `memory/lessons/2026-06-29-c3-55-56-cancel-prematurely.md` — don't cancel sibling issues without verifying the staged-pair relationship first.
   - `memory/lessons/2026-06-25-c3-trust-boundary-auth-architecture.md` — loopback trust is the right primitive for the add-on; revisit only when topology changes.
   - Don't quote memory files for "Plane facts." Always query Plane.