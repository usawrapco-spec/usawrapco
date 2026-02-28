-- Add merchant_ref column for Wisetack webhook lookup (invoice_number used as reference)
ALTER TABLE public.financing_applications
  ADD COLUMN IF NOT EXISTS merchant_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_financing_applications_merchant_ref
  ON public.financing_applications(merchant_ref)
  WHERE merchant_ref IS NOT NULL;
