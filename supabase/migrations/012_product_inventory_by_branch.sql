-- Per-branch inventory breakdown (on_hand/on_order/reserved per SKU per branch)
-- products.on_hand/on_order/reserved remain as aggregated totals

CREATE TABLE IF NOT EXISTS product_inventory_by_branch (
  product_id  BIGINT   NOT NULL,
  branch_id   INTEGER  NOT NULL,
  on_hand     DOUBLE PRECISION NOT NULL DEFAULT 0,
  on_order    DOUBLE PRECISION NOT NULL DEFAULT 0,
  reserved    DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_branch_branch  ON product_inventory_by_branch (branch_id);
CREATE INDEX IF NOT EXISTS idx_inv_branch_on_hand ON product_inventory_by_branch (on_hand);
