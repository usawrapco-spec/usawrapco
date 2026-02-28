-- Rename invoices.balance → invoices.balance_due
-- The column was called 'balance' in DB but 'balance_due' everywhere in the UI code
ALTER TABLE public.invoices RENAME COLUMN balance TO balance_due;
