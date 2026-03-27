-- Add is_excluded flag to product_categories
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT false;
