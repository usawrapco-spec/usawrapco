-- Email signatures per user + default email template seeding
-- Applied as a corrective migration (earlier file 20260225130000 was out of order)

-- Per-user email signature stored on profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_signature text;

-- Seed 6 default email templates for the org (skip if name already exists)
INSERT INTO email_templates (org_id, name, email_type, subject, body_html)
SELECT
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f' AS org_id,
  t.name, t.email_type, t.subject, t.body_html
FROM (VALUES
  (
    'Quote Follow Up',
    'follow_up',
    'Following up on your wrap quote',
    '<p>Hi {{contact_name}},</p><p>I wanted to follow up on the quote we sent over for your vehicle wrap project. Have you had a chance to review it?</p><p>We''d love to get you scheduled — our calendar fills up quickly. Feel free to reply here or give us a call with any questions!</p>'
  ),
  (
    'Job Complete — Ready for Pickup',
    'job_complete',
    'Your vehicle wrap is complete!',
    '<p>Hi {{contact_name}},</p><p>Great news — your vehicle wrap is complete and ready for pickup!</p><p>Our shop hours are <strong>Monday–Friday 8am–5pm</strong>. Please give us a heads-up before you come in so we can have your vehicle ready.</p><p>Thank you for trusting USA Wrap Co with your project — we can''t wait for you to see it!</p>'
  ),
  (
    'Design Proof Ready',
    'proof_ready',
    'Your design proof is ready for review',
    '<p>Hi {{contact_name}},</p><p>Your design proof is ready! Please take a look and let us know:</p><ul><li>If you''d like any changes, describe them and we''ll revise.</li><li>If everything looks great, just reply with your approval and we''ll order materials and get into production.</li></ul><p>We want to make sure you love it before we move forward!</p>'
  ),
  (
    'Deposit Invoice Sent',
    'deposit',
    'Deposit invoice for your wrap project',
    '<p>Hi {{contact_name}},</p><p>Thank you for choosing USA Wrap Co! Attached is your deposit invoice to lock in your project and reserve your spot on our calendar.</p><p>Once we receive your deposit, we''ll kick off the design process right away and keep you updated every step of the way.</p>'
  ),
  (
    'Appointment Reminder',
    'reminder',
    'Reminder: Your wrap appointment is coming up',
    '<p>Hi {{contact_name}},</p><p>Just a friendly reminder about your upcoming appointment with USA Wrap Co!</p><p><strong>Before drop-off, please:</strong></p><ul><li>Give your vehicle a good wash</li><li>Remove personal items from inside</li><li>Make sure the gas tank is at least half full</li></ul><p>See you soon — we''re excited to get started on your project!</p>'
  ),
  (
    'Referral Thank You',
    'referral',
    'Thank you for the referral!',
    '<p>Hi {{contact_name}},</p><p>We wanted to reach out and personally thank you for referring someone to USA Wrap Co! Word-of-mouth referrals are the backbone of our business and we truly appreciate your trust and support.</p><p>As a thank-you, we''d love to offer you a <strong>$50 credit</strong> toward your next project. Just mention this email when you reach out!</p>'
  )
) AS t(name, email_type, subject, body_html)
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates
  WHERE org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
    AND name = t.name
);
