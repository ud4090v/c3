# C3 — Three-Layer Architecture (Canonical Reference)

**Status:** live. **Authoritative.** If you find this contradicts a session's ad-hoc decisions, this file wins.

This document is the single source of architectural truth for the C3 system. It supersedes per-session memory notes and per-issue Plane descriptions. Update here when the design changes.

---

## 1. Purpose

C3 is a multi-tenant command-and-control dashboard for OpenClaw orgs. It lets an operator see all the AI agents in their org, the tasks being routed between them, the audit log of inter-agent messages, and the operational state of the OpenClaw infrastructure.

Each org's data is private to that org. The dashboard is a single web app, served from one place, talking to a single public API, which talks to per-org add-ons running inside each customer's network.

---

## 2. The three layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — PUBLIC UI                                                      │
│                                                                          │
│  Repo:    ud4090v/c3                                                     │
│  Runtime: Vercel (static SPA, Vite + React + React Query + Socket.IO    │
│           client — Socket.IO is wired but unused in v1, see §6)          │
│  URL:     https://c3.blackrabbitgroup.org                                │
│  Domain:  Apex blackrabbitgroup.org (DNS at Google Cloud DNS)            │
│  Vercel:  project openclaw-c3, BlackRabbitDev team                       │
│  Source:  https://github.com/ud4090v/c3                                  │
│                                                                          │
│  Invariants:                                                             │
│  - Static only. No backend in this repo.                                  │
│  - All API calls go to relative paths under `/api/*` (same-origin).      │
│  - The browser never sees absolute URLs to the API or to add-ons.        │
│  - Bundle is rebuilt and redeployed by Vercel on every push to main.     │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ HTTPS, same-origin via Vercel rewrite
                                   │ (no CORS, no preflight)
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — PUBLIC API                                                     │
│                                                                          │
│  Repo:    ud4090v/c3-api   (BUILT IN PHASE 2 of C3-56)                   │
│  Runtime: Vercel serverless functions (Node.js, @vercel/node)            │
│  URL:     https://c3-api.vercel.app (default Vercel hostname)            │
│           rewrite target from ud4090v/c3/vercel.json                     │
│  Source:  https://github.com/ud4090v/c3-api                              │
│                                                                          │
│  Invariants:                                                             │
│  - Stateless. NO persistent storage of customer data in this layer.      │
│  - Per-org API key auth (HMAC-SHA256 signed requests), key shape:        │
│      c3k_live_<32-char-base62>  |  c3k_test_<32-char-base62>             │
│  - Acts as a router + transformer: receives browser request, signs a     │
│    request to the customer's add-on, returns the add-on's response.      │
│  - Reads no org data directly. All facts about an org come from the      │
│    org's own add-on.                                                     │
│  - Multi-tenant from day one (ADR-C3-002). Per-org rate limiting lives   │
│    here (sliding window keyed by org_id from the API key).               │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ HTTPS, HMAC-signed requests
                                   │ (per-org API key from public API layer)
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — OPENCLAW ADD-ON                                               │
│                                                                          │
│  Repo:    ud4090v/openclaw-c3-addon                                       │
│  Runtime: Node.js, Fastify, loopback-only bind                           │
│  Bind:    127.0.0.1:52400 (no public DNS, no public port)                │
│  Source:  https://github.com/ud4090v/openclaw-c3-addon                   │
│  Reachable via:  Cloudflare Tunnel → add-on.blckrbbt.io                  │
│                                                                          │
│  Invariants:                                                             │
│  - Listens on loopback ONLY. Never bound to a public interface.          │
│  - Customer data lives here (SQLite at ~/.openclaw/c3-addon/data/).      │
│  - Verifies HMAC signature on every incoming request. Constant-time     │
│    comparison, timestamp window ±5 min, nonce cache for replay defense.  │
│  - Wraps the OpenClaw CLI (`openclaw sessions`, `openclaw agent`, etc.)  │
│    and exposes them as REST endpoints under /openclaw/*.                 │
│  - Falls back to mock data ONLY when the OpenClaw service is genuinely    │
│    unreachable (not on auth errors or transient blips). Tracks fallback  │
│    state and surfaces it at /openclaw/sync-status for the dashboard.     │
│  - One add-on per org. Public API knows how to reach each org's add-on   │
│    from the org_id embedded in the API key signature.                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Why three layers, not two:** the customer-data-locality requirement (compliance, data residency) means the public API cannot hold customer data. The add-on keeps data on the customer's box. The public API is pure router logic that can be deployed once and serve many orgs.

**Why not CORS:** the SPA and the public API share the same origin (Vercel rewrites `/api/*` from the SPA domain to the API domain transparently). The browser never sees the API as a separate origin, so no CORS preflight, no credentialed requests, no `withCredentials` plumbing. The add-on is never reachable from the browser — only from the public API.

---

## 3. Wire-level contracts

### 3.1 SPA → Public API (browser → Vercel rewrite → public API)

Same-origin. The SPA uses relative `/api/*` paths. Vercel rewrite in `ud4090v/c3/vercel.json` proxies `/api/:path*` to `https://c3-api.vercel.app/:path*` server-side. Browser doesn't know.

### 3.2 Public API → Add-on (server → server, cross-trust-boundary)

Every request is HMAC-signed. Headers required:

| Header           | Value                                                          |
|------------------|----------------------------------------------------------------|
| `X-C3-Org-Id`    | org identifier (matches the API key's bound org)               |
| `X-C3-Timestamp` | unix seconds, integer string                                   |
| `X-C3-Nonce`     | 16 random bytes, hex (32 chars)                                |
| `X-C3-Signature` | hex HMAC-SHA256                                               |

String-to-sign: `METHOD\nPATH\nTIMESTAMP\nNONCE\nsha256(body)-hex`. HMAC key: base64-decoded `api_secret` from the add-on's `~/.openclaw/c3-addon/config.json`. Constant-time comparison. Timestamp tolerance: ±300s. Nonce cache TTL: 10 min (replay protection).

### 3.3 Add-on → OpenClaw CLI

The add-on shells out to `openclaw sessions --json`, `openclaw agent --session-key <key> -m <message> --json`, and `openclaw config get agents.list --json`. The CLI is the authoritative source of agent / session state. Mock fallback only when CLI is genuinely unreachable (ENOENT, ECONNREFUSED, command-not-found).

---

## 4. Trust boundaries

- **Internet ↔ Public UI**: TLS, public. No auth on the SPA itself (public product). All auth happens at the public API.
- **SPA ↔ Public API**: same-origin via Vercel rewrite. Public API authenticates via per-org API key carried in `X-C3-*` headers by the SPA (server-side, not by the browser).
- **Public API ↔ Add-on**: HMAC-signed. The public API holds the org's API key; the add-on holds the corresponding secret. Neither side is publicly reachable except through Vercel or the Cloudflare Tunnel.
- **Add-on ↔ OpenClaw**: same-box, same-user process. Trust by co-location.

**Out of scope for v1:**
- Mutual TLS between public API and add-on. HMAC alone is sufficient given the tunnel-only network path; can be added if/when the tunnel becomes unreliable.
- Browser-to-public-API auth. The SPA is the public-facing surface; auth at the API layer is per-org (operator-level), not per-user.

---

## 5. Data ownership

| Data class             | Owner       | Storage                                              |
|------------------------|-------------|------------------------------------------------------|
| Agent roster, status   | Add-on      | SQLite at `~/.openclaw/c3-addon/data/c3.db` + live CLI queries |
| Task history           | Add-on      | SQLite, same DB                                      |
| Audit log              | Add-on      | SQLite, same DB                                      |
| Notifications          | Add-on      | SQLite, same DB                                      |
| API keys, org_id table | Public API  | Vercel KV or Postgres (Phase 6 — single-org at launch) |
| Vault (.md files)      | Add-on      | Read-only fs at `~/.openclaw/vault/`                 |

**Critical invariant:** the public API never writes customer data. It only routes.

**At launch (Phase 2 of C3-56):** single-org mode. The only org is the BRG org itself. The public API has one hardcoded API key, the add-on has its matching secret. Multi-tenant scaffolding is in place but the org-creation flow is not built until Phase 6.

---

## 6. Real-time updates

**v1:** polling. React Query `refetchInterval: 10000` (10s) on the SPA. Socket.IO client code is wired (`src/hooks/useRealtimeUpdates.ts`) but disabled. ADR-C3-004: deferred.

**Rationale:** Vercel serverless functions can't hold long-lived WebSocket connections. Adding Socket.IO means a separate persistent service (Pusher, Ably, Fly.io). For a control plane, 10s staleness is acceptable.

---

## 7. Repository map

| Layer | Repo                              | Purpose                                 | Status        |
|-------|-----------------------------------|-----------------------------------------|---------------|
| 1     | `ud4090v/c3`                      | Public UI (Vite + React)                | ✅ Live       |
| 2     | `ud4090v/c3-api`                  | Public API (Express on Vercel)          | ⏳ Phase 2    |
| 3     | `ud4090v/openclaw-c3-addon`        | OpenClaw add-on (Fastify, loopback)     | ✅ Built, ⏳ redeploy |
| —     | `ud4090v/openclaw-c3` (archived)  | Legacy mono-repo, history preserved     | 📦 Archived   |

---

## 8. Infrastructure map

| Component                | Where                          | URL                                              |
|--------------------------|--------------------------------|--------------------------------------------------|
| Public UI                | Vercel                         | https://c3.blackrabbitgroup.org                  |
| Public API               | Vercel (serverless functions)  | https://c3-api.vercel.app                        |
| Add-on (BRG org)         | SAXA box, 127.0.0.1:52400      | via tunnel → https://add-on.blckrbbt.io          |
| OpenClaw CLI             | SAXA box, same-user            | (local, not network-reachable)                   |
| DNS (apex)               | Google Cloud DNS               | blackrabbitgroup.org                             |
| DNS (sub)                | Google Cloud DNS               | c3.blackrabbitgroup.org → Vercel anycast         |
| Tunnel                   | Cloudflare Tunnel on SAXA      | add-on.blckrbbt.io → 127.0.0.1:52400             |

---

## 9. Deployment topology per layer

### Layer 1 — Public UI (`ud4090v/c3`)

```
Push to main on GitHub
   ↓
Vercel auto-detects framework (vite)
   ↓
pnpm install && pnpm build  (in Vercel build env)
   ↓
Outputs to dist/
   ↓
Vercel CDN serves dist/ at the project's assigned hostnames
   ↓
vercel.json rewrites /api/* to c3-api.vercel.app
```

**No runtime state. Zero persistent volumes. Free tier fine for v1.**

### Layer 2 — Public API (`ud4090v/c3-api`)

```
Push to main on GitHub
   ↓
Vercel auto-detects (no framework — pure Node serverless)
   ↓
api/*.ts compiled to serverless functions
   ↓
Each /api/* path is a serverless function (10s timeout on hobby, 60s on pro)
   ↓
Function runtime: Node 22, fetch to add-on via HMAC
   ↓
Vercel CDN in front, function cold-start ~50-500ms
```

**No persistent volumes. API key table lives in Vercel KV (single entry at launch).** When tenant count > 1, migrate to Vercel Postgres.

### Layer 3 — Add-on (`ud4090v/openclaw-c3-addon`)

```
Git clone on SAXA box (or `npm install -g` for the public release)
   ↓
pnpm install && pnpm build
   ↓
Generate ~/.openclaw/c3-addon/config.json with org_id, api_key, api_secret, bind_host=127.0.0.1, bind_port=52400, openclaw_cli_path
   ↓
Systemd unit: c3-addon.service (after=network.target, restart=always)
   ↓
Cloudflare Tunnel: cloudflared service, ingress rule add-on.blckrbbt.io → 127.0.0.1:52400
   ↓
Public API has the matching api_key in its config
```

**Persistent state: SQLite at `~/.openclaw/c3-addon/data/c3.db`. Schema is `packages/server/src/db/` from the legacy c3-server, lifted verbatim — tables for agents, tasks, audit_messages, notifications, api_keys.**

**No public port. Tunnel-only. Reachable from anywhere but HMAC-gated.**

---

## 10. Phased delivery status

From C3-56's plan:

| Phase | What                                                            | Status      |
|-------|-----------------------------------------------------------------|-------------|
| 1     | Add-on package skeleton                                         | ✅ Done (Phases 1-4 of the original addon build landed in `ud4090v/openclaw-c3-addon` before the archive) |
| 2     | Run add-on on SAXA box + network reachability                  | ⏳ In progress (C3-56 Phase 2, this issue's scope) |
| 3     | Public API on Vercel                                            | ⏳ Pending (this issue)         |
| 4     | Wire SPA to public API (flip Vercel rewrite destination)       | ⏳ Pending (this issue)         |
| 5     | Decommission legacy SAXA monolith                                | ✅ Done (Phase E of C3-55)      |
| 6     | Productization (multi-tenant onboarding, billing, etc.)         | Out of scope for this issue     |

---

## 11. Open decisions and their resolution

| Question                                            | Decision                                                  |
|-----------------------------------------------------|-----------------------------------------------------------|
| Network reachability (add-on ↔ public API)          | Cloudflare Tunnel. `add-on.blckrbbt.io → 127.0.0.1:52400`. |
| Where does customer data live?                      | SQLite in the add-on, at `~/.openclaw/c3-addon/data/`.    |
| Public API auth                                     | Per-org API key (HMAC-SHA256), single org at launch.      |
| Multi-tenant at launch?                             | No. Single-org (BRG) only. Tenant table schema in code but only one row at launch. |
| Polling vs Socket.IO                                | Polling at 10s. Socket.IO client wired but disabled.      |
| Where to host the public API                        | Vercel serverless functions (same account as UI).         |
| Migration path if Vercel changes pricing?           | Re-deploy to Fly.io or Render. API code is portable Express. |
| What happens to the legacy `api.blckrbbt.io` tunnel after this issue lands? | Decommissioned. Public API becomes the new termination point. Tunnel to SAXA becomes the add-on-only tunnel (`add-on.blckrbbt.io`). |
| What about the `c3.blckrbbt.io` domain (public API, per Cormac) | Separate surface, future use. Out of scope here. |

---

## 12. What this document is NOT

- Not a runbook. Runbooks live in `memory/YYYY-MM-DD-*-runbook.md` per session.
- Not an ADR log. ADRs are inline §11-style decisions for now; graduate to a separate log when one of them gets reversed.
- Not a deployment manifest. Vercel project settings, DNS records, Cloudflare Tunnel config are tracked in Plane issues, not here.
- Not exhaustive. New questions get a row in §11, not a section rewrite. Update §2-9 only when the architecture itself changes.

---

**Last updated:** 2026-06-29 — Mauzz, after Cormac clarified the three-layer design intent.