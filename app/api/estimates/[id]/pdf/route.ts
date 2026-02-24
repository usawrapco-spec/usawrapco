import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const runtime = 'edge'

/**
 * Generate Estimate PDF
 * GET /api/estimates/[id]/pdf
 * Returns branded PDF for estimate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin()

    // Fetch estimate with customer and line items
    const { data: estimate, error } = await admin
      .from('estimates')
      .select(`
        *,
        customer:customer_id(*),
        org:org_id(*)
      `)
      .eq('id', params.id)
      .single()

    if (error || !estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      )
    }

    // Generate HTML for PDF — mode=customer hides rolled-up items, mode=internal shows all
    const mode = request.nextUrl.searchParams.get('mode') || 'customer'
    const html = generateEstimateHTML(estimate, mode)

    // Return HTML that can be printed to PDF by browser
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

function generateEstimateHTML(estimate: any, mode: string = 'customer'): string {
  const allLineItems = (estimate.line_items || []) as any[]
  const customer = estimate.customer || {}
  const org = estimate.org || {}
  const isCustomerMode = mode === 'customer'

  // Build rolled-up parent/child mapping
  const rolledUpIds = new Set<string>()
  const childrenTotals = new Map<string, number>()

  for (const li of allLineItems) {
    const specs = li.specs || {}
    if (specs.rolledUp && specs.parentItemId) {
      rolledUpIds.add(li.id)
      const pid = specs.parentItemId as string
      childrenTotals.set(pid, (childrenTotals.get(pid) || 0) + (li.total || li.total_price || 0))
    }
  }

  // In customer mode, filter out rolled-up items; in internal mode, show all
  const lineItems = isCustomerMode
    ? allLineItems.filter((li: any) => !rolledUpIds.has(li.id))
    : allLineItems

  const subtotal = allLineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
  const taxRate = org.settings?.tax_rate || 8.25
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estimate ${estimate.estimate_number || estimate.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 40px;
      max-width: 8.5in;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4f7fff;
    }
    .company {
      flex: 1;
    }
    .company-name {
      font-size: 28px;
      font-weight: 900;
      color: #4f7fff;
      margin-bottom: 8px;
    }
    .company-info {
      font-size: 12px;
      color: #666;
      line-height: 1.5;
    }
    .estimate-info {
      text-align: right;
    }
    .estimate-title {
      font-size: 32px;
      font-weight: 900;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .estimate-meta {
      font-size: 12px;
      color: #666;
    }
    .estimate-meta div {
      margin-bottom: 4px;
    }
    .customer-block {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .customer-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .customer-name {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .customer-details {
      font-size: 14px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: #f8f9fa;
    }
    th {
      text-align: left;
      padding: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      border-bottom: 2px solid #e0e0e0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    .item-name {
      font-weight: 600;
      color: #1a1a1a;
    }
    .item-desc {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
      border-top: 2px solid #e0e0e0;
      padding-top: 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .totals-row.total {
      font-size: 20px;
      font-weight: 900;
      color: #4f7fff;
      padding-top: 12px;
      border-top: 2px solid #4f7fff;
      margin-top: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    .next-steps {
      background: #e8f0ff;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .next-steps strong {
      color: #4f7fff;
      display: block;
      margin-bottom: 4px;
    }
    .terms {
      font-size: 11px;
      color: #999;
      margin-bottom: 20px;
    }
    .signature {
      display: flex;
      gap: 40px;
      margin-top: 30px;
    }
    .signature-field {
      flex: 1;
    }
    .signature-line {
      border-top: 1px solid #999;
      margin-top: 40px;
      padding-top: 8px;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company">
      <div class="company-name">${org.name || 'USA Wrap Co'}</div>
      <div class="company-info">
        ${org.settings?.address || '4124 124th St NW, Gig Harbor, WA 98332'}<br>
        ${org.settings?.phone || '(253) 555-0100'}<br>
        ${org.settings?.website || 'https://usawrapco.com'}
      </div>
    </div>
    <div class="estimate-info">
      <div class="estimate-title">ESTIMATE</div>
      <div class="estimate-meta">
        <div><strong>Estimate #:</strong> ${estimate.estimate_number || estimate.id.slice(0, 8).toUpperCase()}</div>
        <div><strong>Date:</strong> ${new Date(estimate.created_at).toLocaleDateString()}</div>
        <div><strong>Valid Until:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
      </div>
    </div>
  </div>

  <!-- Customer Block -->
  <div class="customer-block">
    <div class="customer-title">Customer Information</div>
    <div class="customer-name">${customer.name || 'Customer'}</div>
    <div class="customer-details">
      ${customer.company_name ? customer.company_name + '<br>' : ''}
      ${customer.email || ''} ${customer.phone ? '• ' + customer.phone : ''}
    </div>
  </div>

  <!-- Line Items -->
  <table>
    <thead>
      <tr>
        <th>Product / Service</th>
        <th style="width: 80px;">Qty</th>
        <th style="width: 100px;" class="text-right">Unit Price</th>
        <th style="width: 100px;" class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.map((item: any) => {
        const specs = item.specs || {}
        const isChild = !!(specs.rolledUp && specs.parentItemId)
        const extraTotal = childrenTotals.get(item.id) || 0
        const displayTotal = isCustomerMode ? (item.total || 0) + extraTotal : (item.total || 0)
        const rolledUpBadge = (!isCustomerMode && isChild)
          ? ' <span style="font-size:9px;color:#999;background:#f0f0f0;padding:1px 5px;border-radius:3px;font-weight:800;letter-spacing:0.04em;">ROLLED UP</span>'
          : ''
        const rowStyle = isChild ? 'style="background:#fafafa;border-left:3px solid #ddd;"' : ''
        const indent = isChild ? 'style="padding-left:24px;"' : ''
        return `
        <tr ${rowStyle}>
          <td ${indent}>
            <div class="item-name">${item.product || item.name || 'Line Item'}${rolledUpBadge}</div>
            ${item.vehicle ? `<div class="item-desc">${item.vehicle}</div>` : ''}
            ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
            ${item.notes ? `<div class="item-desc">${item.notes}</div>` : ''}
          </td>
          <td>${item.qty || item.quantity || 1}</td>
          <td class="text-right">${formatMoney(item.price || item.unit_price || 0)}</td>
          <td class="text-right"><strong>${formatMoney(displayTotal)}</strong></td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${formatMoney(subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>Tax (${taxRate}%):</span>
      <span>${formatMoney(tax)}</span>
    </div>
    <div class="totals-row total">
      <span>TOTAL:</span>
      <span>${formatMoney(total)}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="next-steps">
      <strong>Next Steps:</strong>
      Ready to move forward? Complete your vehicle onboarding at:<br>
      <a href="${org.settings?.website || 'https://usawrapco.com'}/intake/${estimate.id}">${org.settings?.website || 'usawrapco.com'}/intake/${estimate.id}</a>
    </div>

    <div class="terms">
      <strong>Terms & Conditions:</strong><br>
      Payment: 50% deposit required to begin work. Final payment due upon completion.
      Warranty: 1-year warranty on materials and workmanship. Does not cover damage from accidents, improper care, or normal wear.
      Timeline: Standard turnaround 7-10 business days from approval. Rush service available.
      Cancellation: Deposits are non-refundable after work begins.
    </div>

    <div class="signature">
      <div class="signature-field">
        <div class="signature-line">Customer Signature</div>
      </div>
      <div class="signature-field">
        <div class="signature-line">Date</div>
      </div>
    </div>
  </div>

  <!-- Print Button (hidden when printing) -->
  <div class="no-print" style="text-align: center; margin-top: 40px;">
    <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; background: #4f7fff; color: white; border: none; border-radius: 8px; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`
}
