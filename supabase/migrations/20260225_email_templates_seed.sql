-- Seed default email templates for USA Wrap Co
INSERT INTO email_templates (org_id, name, email_type, subject, body_html)
VALUES
  (
    'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    'Estimate Ready',
    'estimate',
    'Your custom wrap quote is ready to review',
    '<p>Hi {{contact_name}},</p><p>Great news! Your custom vehicle wrap estimate is ready for review. We''ve put together a detailed quote based on your vehicle and design preferences.</p><p><a href="{{view_url}}" style="display:inline-block;padding:12px 24px;background:#4f7fff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">View Your Estimate</a></p><p>If you have any questions about the quote or want to discuss options, just reply to this email or give us a call.</p><p>Looking forward to getting your ride wrapped!</p><p>— The USA Wrap Co Team</p>'
  ),
  (
    'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    'Invoice',
    'invoice',
    'Invoice #{{invoice_number}} is ready for payment',
    '<p>Hi {{contact_name}},</p><p>Your invoice is ready for review and payment.</p><p><a href="{{view_url}}" style="display:inline-block;padding:12px 24px;background:#4f7fff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">View &amp; Pay Invoice</a></p><p>If you have any questions about your invoice, please don''t hesitate to reach out.</p><p>Thank you for your business!</p><p>— The USA Wrap Co Team</p>'
  ),
  (
    'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    'Proof Ready',
    'proof',
    'Your design proof is ready for approval',
    '<p>Hi {{contact_name}},</p><p>Your vehicle wrap design proof is ready! We''ve created a custom mockup based on your specifications and we''re excited for you to see it.</p><p><a href="{{view_url}}" style="display:inline-block;padding:12px 24px;background:#4f7fff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Review Your Proof</a></p><p>Please review the design carefully and let us know if you''d like any changes. Once approved, we''ll move into production!</p><p>— The USA Wrap Co Team</p>'
  ),
  (
    'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    'Job Complete',
    'complete',
    'Your wrap is complete and ready for pickup!',
    '<p>Hi {{contact_name}},</p><p>Your vehicle wrap is complete and looking amazing! We''re excited for you to see the finished product.</p><p>Please contact us to schedule your pickup. We''ll do a final walkthrough together to make sure everything meets your expectations.</p><p>Thanks for choosing USA Wrap Co — we can''t wait to see your reaction!</p><p>— The USA Wrap Co Team</p>'
  ),
  (
    'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    'Follow Up',
    'follow_up',
    'Just checking in on your wrap project',
    '<p>Hi {{contact_name}},</p><p>Just wanted to check in and see how things are going! We noticed you had been looking into a vehicle wrap, and wanted to make sure we answered any questions you might have.</p><p>Whether you''re ready to move forward or just exploring options, we''re here to help. Feel free to reply to this email or give us a call anytime.</p><p>— The USA Wrap Co Team</p>'
  ),
  (
    'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    'Review Request',
    'review',
    'We''d love your feedback on your recent wrap',
    '<p>Hi {{contact_name}},</p><p>It''s been a little while since we completed your vehicle wrap, and we hope you''re loving it!</p><p>We''d really appreciate it if you could take a moment to leave us a review. Your feedback helps other vehicle owners find us and helps us continue to improve.</p><p><a href="https://g.page/usawrapco/review" style="display:inline-block;padding:12px 24px;background:#4f7fff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Leave a Review</a></p><p>Thank you for choosing USA Wrap Co!</p><p>— The USA Wrap Co Team</p>'
  )
ON CONFLICT DO NOTHING;
