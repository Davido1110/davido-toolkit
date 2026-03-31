# RVB Stock Forecast Tool — CLAUDE.md

## Overview
Identical to the `kiotviet-sync` tool (phohangda) in every way — same architecture, same UI, same database schema, same sync logic — but targeting a **separate KiotViet retailer account (RVB)** with its own Supabase project and credentials.

## Shop Configuration
- **Shop name (retailer slug):** `ranverbae`
- **Scale:** TBD
- **Users:** TBD

> **SECURITY:** ClientId and Client Secret must ONLY live in environment variables. Never commit them to code.

## Architecture

```
Frontend (React in hub)
    ↕ Supabase JS client
Supabase (PostgreSQL + Edge Functions)   ← separate project from phohangda
    ↕ KiotViet Public API
KiotViet servers (RVB retailer account)
```

Same as `kiotviet-sync`: frontend calls Supabase directly for reads, triggers Edge Functions for sync. Sync logic lives in Supabase Edge Functions (Deno). Scheduler via GitHub Actions at 2:00 AM daily.

## KiotViet API
Identical to `kiotviet-sync`. See that tool's CLAUDE.md for full endpoint list, rate limit strategy, auth flow, and error handling. Only difference: `Retailer` header uses `ranverbae`.

## Database Schema
Identical to `kiotviet-sync` — same tables, same columns, same indexes:
- `branches`
- `products`
- `orders`
- `order_details`
- `inventory_snapshots`
- `sync_logs`

See `src/tools/kiotviet-sync/CLAUDE.md` for full schema DDL.

## Sync Flow
Identical to `kiotviet-sync` — staging table pattern, incremental sync via `lastModifiedFrom`, same retry/error handling.

## UI Pages
Identical to `kiotviet-sync`:
- **Dashboard** — last sync status, today's summary, Sync Now button
- **Orders** — table with date/branch/status filters, order detail, Excel export
- **Inventory** — SKU table with low-stock highlighting, branch/category filters
- **Sync Logs** — history table, error detail on row click

## Implementation Phases
Same phases as `kiotviet-sync`:
- **Phase 1:** Auth + token refresh, sync orders + inventory for 1 branch, Dashboard + Sync Logs
- **Phase 2:** All branches, incremental sync, retry logic, Orders + Inventory pages
- **Phase 3:** GitHub Actions cron at 2 AM, email alerts via Resend.com, config page, dashboard charts

## Environment Variables
```
KIOTVIET_CLIENT_ID_RVB       # RVB KiotViet OAuth client ID
KIOTVIET_CLIENT_SECRET_RVB   # RVB KiotViet OAuth client secret
KIOTVIET_RETAILER_RVB        # RVB shop slug
SUPABASE_URL_RVB             # RVB Supabase project URL
SUPABASE_ANON_KEY_RVB        # RVB Supabase anon key
SUPABASE_SERVICE_KEY_RVB     # RVB Supabase service role key (Edge Functions only)
```

For the Vite frontend, prefix with `VITE_` where needed. Service key is Edge Functions only — never expose to browser.
