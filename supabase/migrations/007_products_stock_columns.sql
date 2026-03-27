-- Move inventory totals directly onto products, drop inventory_snapshots

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS on_hand   DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_order  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved  DOUBLE PRECISION NOT NULL DEFAULT 0;

DROP TABLE IF EXISTS inventory_snapshots;
