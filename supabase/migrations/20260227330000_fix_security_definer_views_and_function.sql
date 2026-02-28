-- Fix security DEFINER views — recreate without SECURITY DEFINER property
-- billing_pipeline_summary
CREATE OR REPLACE VIEW public.billing_pipeline_summary AS
 SELECT p.org_id,
    p.id AS project_id,
    p.title,
    p.status AS project_status,
    p.revenue,
    p.created_at,
    e.id AS estimate_id,
    e.estimate_number,
    e.status AS estimate_status,
    e.total AS estimate_total,
    i.id AS invoice_id,
    i.invoice_number,
    i.status AS invoice_status,
    i.total AS invoice_total,
    i.amount_paid,
    i.balance,
    i.invoice_date,
    i.due_date,
    i.pay_link_token
   FROM ((projects p
     LEFT JOIN estimates e ON ((e.project_id = p.id)))
     LEFT JOIN invoices i ON ((i.project_id = p.id)))
  WHERE (p.org_id IS NOT NULL);

-- customer_all_photos
CREATE OR REPLACE VIEW public.customer_all_photos AS
 SELECT 'job_photo'::text AS source_type,
    jp.id,
    jp.project_id,
    p.customer_id,
    jp.url AS photo_url,
    jp.caption,
    jp.photo_type AS category,
    jp.created_at,
    jp.uploaded_by,
    p.title AS job_title,
    p.vehicle_desc
   FROM (job_photos jp
     JOIN projects p ON ((jp.project_id = p.id)))
UNION ALL
 SELECT 'vehicle_photo'::text AS source_type,
    vp.id,
    vp.project_id,
    p.customer_id,
    vp.public_url AS photo_url,
    vp.file_name AS caption,
    vp.angle AS category,
    vp.created_at,
    vp.created_by AS uploaded_by,
    p.title AS job_title,
    p.vehicle_desc
   FROM (vehicle_photos vp
     JOIN projects p ON ((vp.project_id = p.id)));

-- invoice_summary_stats
CREATE OR REPLACE VIEW public.invoice_summary_stats AS
 SELECT org_id,
    date_trunc('month'::text, (invoice_date)::timestamp with time zone) AS month,
    count(*) FILTER (WHERE (status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text]))) AS open_count,
    sum(total) FILTER (WHERE (status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text]))) AS open_amount,
    count(*) FILTER (WHERE (status = 'paid'::text)) AS paid_count,
    sum(total) FILTER (WHERE (status = 'paid'::text)) AS paid_amount,
    count(*) FILTER (WHERE (status = 'overdue'::text)) AS overdue_count,
    sum(total) FILTER (WHERE (status = 'overdue'::text)) AS overdue_amount,
    count(*) AS total_count,
    sum(total) AS total_amount,
    sum(balance) AS total_outstanding
   FROM invoices
  GROUP BY org_id, (date_trunc('month'::text, (invoice_date)::timestamp with time zone));

-- Fix auto_populate_invoice_line_items: add SET search_path = public
CREATE OR REPLACE FUNCTION public.auto_populate_invoice_line_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_line_items jsonb;
BEGIN
  IF (NEW.line_items_detail IS NULL OR jsonb_array_length(COALESCE(NEW.line_items_detail, '[]'::jsonb)) = 0)
     AND NEW.project_id IS NOT NULL THEN

    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;

    IF FOUND THEN
      v_line_items := jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'name', COALESCE(v_project.title, 'Vehicle Wrap Services'),
          'description', COALESCE(
            NULLIF(v_project.vehicle_desc, ''),
            CONCAT_WS(' ', v_project.vehicle_year, v_project.vehicle_make, v_project.vehicle_model)
          ),
          'quantity', 1,
          'unit', 'job',
          'unit_price', COALESCE(v_project.revenue, NEW.total, 0),
          'extended_price', COALESCE(v_project.revenue, NEW.total, 0),
          'taxable', true,
          'category', 'services',
          'sort_order', 1
        )
      );

      NEW.line_items_detail := v_line_items;

      IF NEW.line_items IS NULL OR jsonb_array_length(COALESCE(NEW.line_items, '[]'::jsonb)) = 0 THEN
        NEW.line_items := v_line_items;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
