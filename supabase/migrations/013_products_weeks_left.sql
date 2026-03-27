-- Add weeks_left column: (on_hand + on_order - reserved) / avg_weekly_sales
-- NULL when avg_weekly_sales = 0 (no sales history, cannot predict)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weeks_left DOUBLE PRECISION;
