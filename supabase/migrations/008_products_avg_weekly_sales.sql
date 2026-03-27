-- Add avg_weekly_sales column to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS avg_weekly_sales DOUBLE PRECISION NOT NULL DEFAULT 0;
