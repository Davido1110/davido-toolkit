-- Remove self-referencing FK on parent_id — insertion order from KiotViet is not guaranteed
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_parent_id_fkey;
