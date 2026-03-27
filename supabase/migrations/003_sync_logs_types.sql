-- Extend sync_logs.sync_type to include 'categories' and 'branches'
ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_sync_type_check;
ALTER TABLE sync_logs ADD CONSTRAINT sync_logs_sync_type_check
  CHECK (sync_type IN ('orders','inventory','purchase_orders','full','categories','branches'));
