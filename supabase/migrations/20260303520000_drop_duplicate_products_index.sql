-- Drop duplicate index on products.org_id
-- idx_products_org and idx_products_org_id were both btree(org_id) — keeping idx_products_org
DROP INDEX IF EXISTS public.idx_products_org_id;
