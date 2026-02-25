/**
 * lib/email/templates.ts
 * Branded HTML email templates for USA Wrap Co.
 */

const FOOTER = `
  <tr><td style="background:#0d0f14;padding:20px 28px;font-size:12px;color:#5a6080;text-align:center;border-top:1px solid #1a1d27;">
    <p style="margin:0;">USA Wrap Co &middot; Tacoma, WA</p>
    <p style="margin:4px 0 0;font-size:11px;">fleet@usawrapco.com</p>
  </td></tr>
`

function wrapper(headerColor: string, headerText: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13151c;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
        <tr><td style="background:${headerColor};padding:28px;text-align:center;">
          <img src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp" alt="USA Wrap Co" style="height:44px;width:auto;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;" />
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;">${headerText}</p>
        </td></tr>
        <tr><td style="padding:32px 28px;font-size:15px;line-height:1.6;color:#e8eaed;">
          ${body}
        </td></tr>
        ${FOOTER}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function generateEstimateEmail(project: {
  title?: string
  vehicle_desc?: string
  estimate_number?: string | number
  total?: number
  id?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const viewUrl = `${appUrl}/estimate/view/${project.id}`

  return wrapper(
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'Your Vehicle Wrap Estimate',
    `
    <h2 style="font-size:18px;margin:0 0 12px;color:#e8eaed;">Hi there,</h2>
    <p style="color:#9299b5;line-height:1.6;margin:0 0 24px;">
      Your estimate for <strong style="color:#e8eaed;">${project.title || 'your vehicle wrap'}</strong> is ready.
      We've put together pricing tailored to your needs.
    </p>
    ${project.vehicle_desc ? `
    <div style="background:#1a1d27;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-size:12px;color:#5a6080;margin-bottom:4px;">Vehicle</div>
      <div style="font-weight:600;color:#e8eaed;">${project.vehicle_desc}</div>
    </div>` : ''}
    ${project.total ? `
    <div style="background:#1a1d27;border-radius:8px;padding:16px 20px;margin-bottom:24px;display:flex;justify-content:space-between;">
      <div>
        <div style="font-size:12px;color:#5a6080;margin-bottom:4px;">Estimate Total</div>
        <div style="font-size:24px;font-weight:800;color:#4f7fff;">$${Number(project.total).toLocaleString()}</div>
      </div>
      ${project.estimate_number ? `<div style="text-align:right;">
        <div style="font-size:12px;color:#5a6080;margin-bottom:4px;">Estimate #</div>
        <div style="font-weight:600;color:#9299b5;">${project.estimate_number}</div>
      </div>` : ''}
    </div>` : ''}
    <a href="${viewUrl}"
       style="display:block;background:#4f7fff;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:16px;">
      View Your Estimate →
    </a>
    <p style="color:#5a6080;font-size:13px;text-align:center;">
      Valid for 30 days. Have questions? Reply to this email or call us.
    </p>
    `
  )
}

export function generateProofEmail(project: {
  title?: string
  vehicle_desc?: string
}, proofUrl: string) {
  return wrapper(
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'Your Design Proof is Ready',
    `
    <h2 style="font-size:18px;margin:0 0 12px;color:#e8eaed;">Your wrap design is ready for review!</h2>
    <p style="color:#9299b5;line-height:1.6;margin:0 0 24px;">
      We've completed your wrap design for <strong style="color:#e8eaed;">${project.title || 'your vehicle'}</strong>.
      Please review and let us know if you'd like any changes.
    </p>
    <a href="${proofUrl}"
       style="display:block;background:#8b5cf6;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:20px;">
      Review Your Design →
    </a>
    <div style="background:#1a1d27;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <div style="color:#9299b5;font-size:13px;line-height:1.6;">
        <strong style="color:#e8eaed;">What happens next?</strong><br/>
        • Review the design carefully<br/>
        • Click "Approve" if it's perfect<br/>
        • Click "Request Changes" with your notes if you'd like revisions<br/>
        • Up to 3 revision rounds are included
      </div>
    </div>
    <p style="color:#5a6080;font-size:13px;text-align:center;">
      Need to talk through the design? Reply to this email or call us.
    </p>
    `
  )
}

export function generateInstallConfirmEmail(project: {
  title?: string
  install_date?: string
}) {
  const dateStr = project.install_date
    ? new Date(project.install_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'TBD — we will contact you to confirm'

  return wrapper(
    'linear-gradient(135deg, #22c07a, #059669)',
    'Installation Confirmed',
    `
    <h2 style="font-size:18px;margin:0 0 12px;color:#e8eaed;">You're on the schedule!</h2>
    <p style="color:#9299b5;line-height:1.6;margin:0 0 24px;">
      Your vehicle wrap installation for <strong style="color:#e8eaed;">${project.title || 'your vehicle'}</strong> is confirmed.
    </p>
    <div style="background:#1a1d27;border-radius:8px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;color:#5a6080;margin-bottom:4px;">Install Date</div>
      <div style="font-size:18px;font-weight:700;color:#22c07a;">${dateStr}</div>
    </div>
    <div style="background:#1a1d27;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <div style="color:#9299b5;font-size:13px;line-height:1.8;">
        <strong style="color:#e8eaed;">Please remember:</strong><br/>
        • Arrive 10 minutes early<br/>
        • Vehicle must be clean inside and out<br/>
        • Remove personal items from the vehicle<br/>
        • Call us at (253) 555-0100 to reschedule if needed
      </div>
    </div>
    `
  )
}

export function generateInvoiceEmail(invoice: {
  invoice_number?: string | number
  total?: number
  due_date?: string
  id?: string
}, customer?: { name?: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const viewUrl = `${appUrl}/invoice/view/${invoice.id}`
  const dueDateStr = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : undefined

  return wrapper(
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'Invoice Ready for Payment',
    `
    <h2 style="font-size:18px;margin:0 0 12px;color:#e8eaed;">Hi ${customer?.name || 'there'},</h2>
    <p style="color:#9299b5;line-height:1.6;margin:0 0 24px;">
      Your invoice from USA Wrap Co is ready. You can pay online securely.
    </p>
    <div style="background:#1a1d27;border-radius:8px;padding:20px;margin-bottom:24px;">
      ${invoice.invoice_number ? `
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;color:#5a6080;margin-bottom:2px;">Invoice #</div>
        <div style="font-weight:600;color:#9299b5;">${invoice.invoice_number}</div>
      </div>` : ''}
      <div style="margin-bottom:${dueDateStr ? '12px' : '0'};">
        <div style="font-size:12px;color:#5a6080;margin-bottom:2px;">Amount Due</div>
        <div style="font-size:24px;font-weight:800;color:#f59e0b;">$${Number(invoice.total || 0).toLocaleString()}</div>
      </div>
      ${dueDateStr ? `<div>
        <div style="font-size:12px;color:#5a6080;margin-bottom:2px;">Due Date</div>
        <div style="font-weight:600;color:#e8eaed;">${dueDateStr}</div>
      </div>` : ''}
    </div>
    <a href="${viewUrl}"
       style="display:block;background:#f59e0b;color:#0d0f14;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:16px;">
      Pay Invoice →
    </a>
    <p style="color:#5a6080;font-size:13px;text-align:center;">
      Questions about your invoice? Reply to this email.
    </p>
    `
  )
}
