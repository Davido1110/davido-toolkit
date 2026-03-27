-- KiotViet Product Categories table

CREATE TABLE IF NOT EXISTS product_categories (
  category_id   INTEGER PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL,
  parent_id     INTEGER      REFERENCES product_categories(category_id),
  has_child     BOOLEAN      NOT NULL DEFAULT false,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  synced_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON product_categories(parent_id);
