# KiotViet Data Sync Tool — CLAUDE.md

## Overview
A data pipeline dashboard that pulls orders, inventory, and supplier purchase orders from KiotViet Public API, stores them in Supabase (PostgreSQL), and provides a monitoring UI.

**This tool has a different architecture than other hub tools.** It requires:
- A Supabase project (PostgreSQL + Edge Functions)
- Environment variables for credentials (never hardcode)
- Vercel Cron for scheduled syncs (Phase 3)

## Shop Configuration
- **Shop name:** phohangda
- **Scale:** 2,000+ SKUs, 1,000+ orders/day, multiple branches (sales branches + warehouse-only branches)
- **Users:** CMO and marketing team — non-technical, needs simple UI

> **SECURITY:** ClientId and Client Secret must ONLY live in environment variables (`VITE_KIOTVIET_CLIENT_ID`, `VITE_KIOTVIET_CLIENT_SECRET` or Supabase Edge Function secrets). Never commit them to code.

## Architecture

```
Frontend (React in hub)
    ↕ Supabase JS client
Supabase (PostgreSQL + Edge Functions)
    ↕ KiotViet Public API
KiotViet servers
```

- **Frontend:** React component inside the hub — calls Supabase directly for reads, triggers Edge Functions for sync
- **Sync logic:** Supabase Edge Functions (Deno) — handles OAuth, pagination, upsert
- **Scheduler:** Vercel Cron or GitHub Actions (Phase 3) — hits Edge Function endpoint at 2:00 AM daily
- **Email alerts (Phase 3):** Resend.com

## KiotViet API

### Authentication
- OAuth 2.0 `client_credentials` flow
- Token endpoint: `POST https://id.kiotviet.vn/connect/token`
- Scope: `PublicApi.Access`
- Token expiry: 86,400s (24h) — auto-refresh when < 5 minutes remain
- Required headers on every request:
  ```
  Retailer: phohangda
  Authorization: Bearer {token}
  ```

### Rate Limit (critical constraint)
- **5,000 GET requests/hour** — the primary bottleneck
- Estimated per sync: ~1,100–1,200 requests (safe for 1 sync/hour)
- Strategies:
  - Always use `pageSize=100` (KiotViet max)
  - Incremental sync via `lastModifiedFrom` (60–80% fewer requests after first run)
  - Request counter — pause and wait for next hour when approaching 5,000
  - Controlled parallel batches: 3–5 concurrent requests, then wait for batch to finish
  - Pass `BranchIds[]` array to get all branches in one inventory request

### Endpoints

| # | Endpoint | Purpose | Key params |
|---|----------|---------|------------|
| 1 | `GET /branches` | List branches | — |
| 2 | `GET /orders` | Orders list | `branchId`, `lastModifiedFrom`, `pageSize=100`, `currentItem`, `includeOrderDelivery` |
| 3 | `GET /orders/{id}` | Order detail | `id` |
| 4 | `GET /invoices` | Issued invoices | `branchId`, `lastModifiedFrom`, `pageSize=100`, `currentItem` |
| 5 | `GET /products` | Products + inventory | `includeInventory=true`, `BranchIds=[]`, `pageSize=100`, `currentItem` |
| 6 | `GET /purchaseOrders` | Supplier POs | `branchId`, `status`, `lastModifiedFrom`, `pageSize=100` |

Base URL: `https://public.kiotapi.com` (confirm from KiotViet docs)

## Database Schema (Supabase PostgreSQL)

### `branches`
```sql
branch_id       INTEGER PRIMARY KEY   -- KiotViet ID
branch_name     VARCHAR(255)
is_warehouse_only BOOLEAN             -- true = kho tạm, exclude from revenue
is_active       BOOLEAN
synced_at       TIMESTAMPTZ
```

### `products`
```sql
product_id      BIGINT PRIMARY KEY    -- KiotViet ID
code            VARCHAR(50) UNIQUE    -- SKU
name            VARCHAR(500)
full_name       VARCHAR(500)
category_id     INTEGER
category_name   VARCHAR(255)
base_price      DECIMAL(15,2)
is_active       BOOLEAN
modified_date   TIMESTAMPTZ           -- INDEX, used for incremental sync
```

### `orders`
```sql
order_id        BIGINT PRIMARY KEY
order_code      VARCHAR(50) UNIQUE
branch_id       INTEGER               -- FK + INDEX
customer_id     BIGINT                -- INDEX
customer_name   VARCHAR(255)
status          INTEGER               -- INDEX
total           DECIMAL(15,2)
discount        DECIMAL(15,2)
order_date      TIMESTAMPTZ           -- INDEX
modified_date   TIMESTAMPTZ           -- INDEX, incremental sync
```

### `order_details`
```sql
id              BIGSERIAL PRIMARY KEY
order_id        BIGINT                -- FK + INDEX
product_id      BIGINT                -- FK + INDEX
product_code    VARCHAR(50)
product_name    VARCHAR(500)
quantity        DOUBLE PRECISION
price           DECIMAL(15,2)
discount        DECIMAL(15,2)
```

### `inventory_snapshots`
Daily snapshot per (product, branch) pair — kept for trend analysis.
```sql
id              BIGSERIAL PRIMARY KEY
snapshot_date   DATE                  -- INDEX
product_id      BIGINT                -- FK + INDEX
branch_id       INTEGER               -- FK + INDEX
on_hand         DOUBLE PRECISION
on_order        DOUBLE PRECISION      -- qty on order from supplier
reserved        DOUBLE PRECISION      -- qty reserved by customers
cost            DECIMAL(15,2)

UNIQUE (snapshot_date, product_id, branch_id)
```

### `sync_logs`
```sql
id              BIGSERIAL PRIMARY KEY
sync_type       VARCHAR(50)           -- orders | inventory | purchase_orders | full
started_at      TIMESTAMPTZ
finished_at     TIMESTAMPTZ
status          VARCHAR(20)           -- success | failed | partial
records_synced  INTEGER
requests_used   INTEGER
error_message   TEXT
branch_id       INTEGER               -- NULL = all shop, value = single branch
```

## Sync Flow

Every sync (manual or scheduled):

1. **Check token** — refresh if < 5 min remaining
2. **Create sync_log** — record start time and type
3. **Get `lastModifiedFrom`** — query `sync_logs` for last successful sync timestamp; omit for first run (full sync)
4. **Pull to staging** — write to temp tables (`staging_orders`, `staging_inventory`) first
5. **Validate** — check record counts, no empty/anomalous data
6. **Upsert to main tables** — `INSERT ... ON CONFLICT DO UPDATE`
7. **Update sync_log** — record success/failure, record count, request count

### Pull order
1. `GET /branches` — run once; cache mapping branchId ↔ branchName
2. `GET /orders` — paginate with `lastModifiedFrom`, `pageSize=100`, `currentItem`
3. `GET /products` — `includeInventory=true`, `BranchIds=[all]`, paginate
4. `GET /purchaseOrders` — supplement `onOrder` with full PO detail if needed

### Error handling
| Error | Action |
|-------|--------|
| HTTP 429 (rate limit) | Pause entire sync, wait until next hour, auto-resume |
| HTTP 5xx | Retry up to 3×, exponential backoff: 5s → 10s → 20s |
| HTTP 401 (token expired) | Auto-refresh token, retry current request |
| Network error | Log, mark sync as `partial`, alert (Phase 3) |
| Partial failure | Save successful portion, log separate error for failed portion |

## UI Pages

### Dashboard (main view)
- Last sync status: timestamp, success/fail, record count
- Today's summary: order count, revenue, total inventory
- **"Sync Now" button** — triggers manual sync with real-time progress bar and log stream
- Branch dropdown (Phase 1: one branch; Phase 2: all)

### Orders page
- Table with filters: date range, branch, status
- Click row → order detail (line items, customer, payment)
- Export to Excel (.xlsx)

### Inventory page
- Table: SKU code, name, on_hand, on_order, reserved — filterable by branch and category
- Highlight rows where `on_hand` < configurable threshold (red/yellow)

### Sync Logs page
- History table: time, type, status, records synced, API calls used
- Click row → full error detail

## Implementation Phases

### Phase 1 — MVP (1–2 weeks)
- Auth + token refresh
- Sync orders + inventory for **1 branch** (smallest/test branch)
- All 6 DB tables created
- Dashboard with Sync Now button
- Sync logs
- **Done when:** DB data matches KiotViet admin 100% for test branch

### Phase 2 — Full shop (1 week)
- All branches
- Incremental sync (`lastModifiedFrom`)
- Full retry/error logic
- Parallel request batches (3–5 concurrent)
- Orders page + Inventory page with filters

### Phase 3 — Automation + Alerts (1–2 weeks)
- Cron job: daily sync at 2:00 AM
- Email alerts: low stock, sync failure, order anomalies (via Resend.com)
- Config page: alert thresholds, recipient email
- Dashboard charts: revenue trend, inventory over time

## Environment Variables
```
KIOTVIET_CLIENT_ID       # KiotViet OAuth client ID
KIOTVIET_CLIENT_SECRET   # KiotViet OAuth client secret
KIOTVIET_RETAILER        # Shop name = phohangda
SUPABASE_URL             # Supabase project URL
SUPABASE_ANON_KEY        # Supabase anon/public key
SUPABASE_SERVICE_KEY     # Supabase service role key (Edge Functions only)
```

For the frontend (Vite), prefix with `VITE_` where needed. Service key must only be used server-side in Edge Functions — never expose to browser.

## Key Risks
| Risk | Level | Mitigation |
|------|-------|-----------|
| Rate limit 5K/h | HIGH | Incremental sync + request counter + controlled batching |
| Token expiry | MED | Auto-refresh < 5 min before expiry |
| Mid-sync failure | HIGH | Staging table pattern — verify before upsert to main tables |
| Warehouse branch contaminating sales data | LOW | `is_warehouse_only=true` flag; exclude from revenue queries |
| API credentials leaked | HIGH | Env vars only, never in code |

## Acceptance Criteria
- Phase 1: Auth works + auto-refresh; orders + inventory sync for 1 branch; data matches KiotViet 100%; Sync Now button works with progress; logs recorded
- Phase 2: Full-shop sync < 5 min; incremental works; retry handles 429/5xx/401; < 2,000 API requests per sync
- Phase 3: Cron runs at 2 AM daily; email alerts fire correctly; dashboard charts render correct data
