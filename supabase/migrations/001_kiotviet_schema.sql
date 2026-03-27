-- KiotViet Sync Tool — Database Schema
-- Run this in Supabase SQL Editor or via `supabase db push`

-- ─── branches ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  branch_id         INTEGER PRIMARY KEY,
  branch_name       VARCHAR(255) NOT NULL,
  is_warehouse_only BOOLEAN      NOT NULL DEFAULT false,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  synced_at         TIMESTAMPTZ
);

-- ─── products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  product_id    BIGINT PRIMARY KEY,
  code          VARCHAR(50)   NOT NULL UNIQUE,
  name          VARCHAR(500)  NOT NULL,
  full_name     VARCHAR(500),
  category_id   INTEGER,
  category_name VARCHAR(255),
  base_price    DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  modified_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_modified ON products(modified_date);

-- ─── orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  order_id      BIGINT PRIMARY KEY,
  order_code    VARCHAR(50)   NOT NULL UNIQUE,
  branch_id     INTEGER       NOT NULL REFERENCES branches(branch_id),
  customer_id   BIGINT,
  customer_name VARCHAR(255),
  status        INTEGER       NOT NULL DEFAULT 1,
  total         DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  order_date    TIMESTAMPTZ   NOT NULL,
  modified_date TIMESTAMPTZ   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_branch     ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date       ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_modified   ON orders(modified_date);

-- ─── order_details ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_details (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT        NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id   BIGINT        NOT NULL,
  product_code VARCHAR(50)   NOT NULL,
  product_name VARCHAR(500)  NOT NULL,
  quantity     DOUBLE PRECISION NOT NULL DEFAULT 0,
  price        DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount     DECIMAL(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_details_order   ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_product ON order_details(product_id);

-- ─── inventory_snapshots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  snapshot_date DATE             NOT NULL,
  product_id    BIGINT           NOT NULL,
  branch_id     INTEGER          NOT NULL REFERENCES branches(branch_id),
  on_hand       DOUBLE PRECISION NOT NULL DEFAULT 0,
  on_order      DOUBLE PRECISION NOT NULL DEFAULT 0,
  reserved      DOUBLE PRECISION NOT NULL DEFAULT 0,
  cost          DECIMAL(15,2)    NOT NULL DEFAULT 0,
  UNIQUE (snapshot_date, product_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_date    ON inventory_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch  ON inventory_snapshots(branch_id);

-- ─── sync_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id             BIGSERIAL PRIMARY KEY,
  sync_type      VARCHAR(50)  NOT NULL CHECK (sync_type IN ('orders','inventory','purchase_orders','full')),
  started_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  status         VARCHAR(20)  NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed','partial')),
  records_synced INTEGER      NOT NULL DEFAULT 0,
  requests_used  INTEGER      NOT NULL DEFAULT 0,
  error_message  TEXT,
  branch_id      INTEGER      REFERENCES branches(branch_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);
