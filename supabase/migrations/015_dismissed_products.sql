-- Products marked as "Bỏ mẫu" (discontinued) are hidden from the Alert tab.
-- Keyed by product name (family) so all SKUs under that name are hidden together.

CREATE TABLE IF NOT EXISTS dismissed_products (
  name        TEXT PRIMARY KEY,
  dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow the anon role to read, insert, and delete (no sensitive data here)
ALTER TABLE dismissed_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON dismissed_products
  FOR ALL TO anon USING (true) WITH CHECK (true);
