-- Create email_logs table (used by inbox/send route for outbound email tracking)
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  customer_id uuid REFERENCES customers(id),
  sent_by uuid REFERENCES profiles(id),
  to_email text,
  to_name text,
  from_email text,
  from_name text,
  subject text,
  body_html text,
  email_type text,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  sendgrid_message_id text,
  reference_id uuid,
  reference_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage email_logs" ON email_logs
  USING (org_id = get_my_org_id());

-- Create email_photo_selections table (used by inbox/send for attaching job photos to emails)
CREATE TABLE IF NOT EXISTS email_photo_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_message_id uuid REFERENCES conversation_messages(id) ON DELETE CASCADE,
  job_image_id uuid REFERENCES job_images(id),
  image_url text,
  caption text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE email_photo_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage email_photo_selections" ON email_photo_selections
  USING (EXISTS (
    SELECT 1 FROM conversation_messages cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.id = email_photo_selections.conversation_message_id
    AND c.org_id = get_my_org_id()
  ));

-- Add auto-approve threshold to employee_pay_settings (used by expenses route)
ALTER TABLE employee_pay_settings
  ADD COLUMN IF NOT EXISTS auto_approve_expenses_under numeric(10,2) DEFAULT 0;
