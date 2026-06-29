# C3 Public UI (SPA)

Public-facing Command & Control Center UI for the OpenClaw Matrix Org.

## Quickstart
```bash
pnpm install
pnpm dev
```

## Build
```bash
pnpm build   # produces dist/
```

## Environment Variables
All reads via `import.meta.env.VITE_*` (Vite convention).  
See `src/lib/api.ts:3` for `API_BASE` (defaults to `/api` same-origin).

## Companion repos
- API + Addon: https://github.com/ud4090v/openclaw-c3-addon
