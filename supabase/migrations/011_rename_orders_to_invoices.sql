-- Rename orders → invoices, order_details → invoice_details

ALTER TABLE order_details RENAME TO invoice_details;
ALTER TABLE orders        RENAME TO invoices;

-- Rename indexes
ALTER INDEX idx_orders_branch   RENAME TO idx_invoices_branch;
ALTER INDEX idx_orders_status   RENAME TO idx_invoices_status;
ALTER INDEX idx_orders_date     RENAME TO idx_invoices_date;
ALTER INDEX idx_orders_modified RENAME TO idx_invoices_modified;

ALTER INDEX idx_order_details_order   RENAME TO idx_invoice_details_invoice;
ALTER INDEX idx_order_details_product RENAME TO idx_invoice_details_product;

-- Rename primary key columns to match new naming (optional cosmetic — data unchanged)
ALTER TABLE invoices        RENAME COLUMN order_id   TO invoice_id;
ALTER TABLE invoices        RENAME COLUMN order_code TO invoice_code;
ALTER TABLE invoices        RENAME COLUMN order_date TO invoice_date;
ALTER TABLE invoice_details RENAME COLUMN order_id   TO invoice_id;
