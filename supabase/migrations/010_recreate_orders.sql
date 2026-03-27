-- Recreate orders and order_details tables (dropped in 009)
-- No FK to branches — branch may not exist yet when orders are synced

CREATE TABLE IF NOT EXISTS orders (
  order_id      BIGINT PRIMARY KEY,
  order_code    VARCHAR(50)   NOT NULL UNIQUE,
  branch_id     INTEGER       NOT NULL,
  customer_id   BIGINT,
  customer_name VARCHAR(255),
  status        INTEGER       NOT NULL DEFAULT 1,
  total         DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  order_date    TIMESTAMPTZ   NOT NULL,
  modified_date TIMESTAMPTZ   NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_branch   ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date     ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_modified ON orders(modified_date);

CREATE TABLE IF NOT EXISTS order_details (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT           NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id   BIGINT           NOT NULL,
  product_code VARCHAR(50)      NOT NULL,
  product_name VARCHAR(500)     NOT NULL,
  quantity     DOUBLE PRECISION NOT NULL DEFAULT 0,
  price        DECIMAL(15,2)    NOT NULL DEFAULT 0,
  discount     DECIMAL(15,2)    NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_details_order   ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_product ON order_details(product_id);
