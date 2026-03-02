'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileDown, Send, Loader2, X, Mail } from 'lucide-react'
import { BRAND, PDF_TERMS } from '@/lib/pdf/brand'
import type { Profile } from '@/types'

interface LineItem {
  id?: string
  description?: string
  quantity?: number
  unit_price?: number
  total?: number
  notes?: string
}

interface Props {
  project: any
  lineItems: LineItem[]
  type: 'estimate' | 'invoice' | 'workorder' | 'salesorder'
  profile: Profile
}

const DOC_LABELS: Record<string, string> = {
  estimate: 'ESTIMATE',
  invoice: 'INVOICE',
  workorder: 'WORK ORDER',
  salesorder: 'SALES ORDER',
}

const DOC_COLORS: Record<string, string> = {
  estimate: '#3b82f6',
  invoice: '#f59e0b',
  workorder: '#22c55e',
  salesorder: '#8b5cf6',
}

function fM(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fD(d: string | null | undefined) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return String(d) }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function DocHeader({ docLabel, docColor, refStr }: { docLabel: string; docColor: string; refStr: string }) {
  return (
    <div style={{ background: '#0f172a', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logoUrl} alt="USA Wrap Co" style={{ height: 48, marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{BRAND.address} · {BRAND.city}</div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{BRAND.phone} · {BRAND.email}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 44, fontWeight: 900, color: docColor, letterSpacing: 2, lineHeight: 1 }}>{docLabel}</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>#{refStr}</div>
      </div>
    </div>
  )
}

function MetaRow({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
      {fields.map(({ label, value }, i) => (
        <div key={label} style={{ padding: '13px 20px', borderRight: i < fields.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function LineItemsTable({ lineItems }: { lineItems: LineItem[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Description', 'Qty', 'Amount'].map((h, i) => (
            <th key={h} style={{
              padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #e2e8f0',
              textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
              width: i === 0 ? 'auto' : i === 1 ? 60 : 130,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lineItems.length > 0 ? lineItems.map((li, i) => (
          <tr key={li.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{li.description || 'Service'}</div>
              {li.notes && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{li.notes}</div>}
            </td>
            <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: '#64748b' }}>{li.quantity ?? 1}</td>
            <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'JetBrains Mono, monospace' }}>
              {fM(Number(li.unit_price ?? li.total ?? 0))}
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan={3} style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No line items on this job</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function DocFooter({ refStr, label }: { refStr: string; label: string }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div style={{ background: '#0f172a', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{BRAND.name} · {BRAND.phone} · {BRAND.website}</div>
      <div style={{ fontSize: 11, color: '#374151', fontFamily: 'JetBrains Mono, monospace' }}>{label}-{refStr} · {today}</div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProjectDocView({ project, lineItems, type, profile }: Props) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  const customer   = (project.customer   ?? {}) as Record<string, any>
  const agent      = (project.agent      ?? {}) as Record<string, any>
  const installer  = (project.installer  ?? {}) as Record<string, any>
  const designer   = (project.designer   ?? {}) as Record<string, any>
  const fd         = (project.form_data  ?? {}) as Record<string, any>
  const fin        = (project.fin_data   ?? {}) as Record<string, any>

  const clientName    = customer.name ?? customer.company_name ?? (fd.client as string) ?? 'Client'
  const clientPhone   = (customer.phone   as string) ?? (fd.phone   as string) ?? ''
  const clientEmail   = (customer.email   as string) ?? (fd.email   as string) ?? ''
  const agentName     = (agent.name       as string) ?? (fd.agent   as string) ?? ''
  const installerName = (installer.name   as string) ?? (fd.installer as string) ?? ''
  const designerName  = (designer.name    as string) ?? ''

  const refStr    = project.id.slice(0, 8).toUpperCase()
  const todayStr  = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const installStr = fD(project.install_date)

  const subtotal  = lineItems.reduce((s, li) => s + Number(li.unit_price ?? li.total ?? 0), 0)
  const taxAmt    = subtotal * 0.081
  const deposit   = 250
  const balance   = Math.max(0, subtotal + taxAmt - deposit)
  const total     = subtotal + taxAmt
  const revenue   = Number(project.revenue ?? subtotal)
  const profit    = Number(project.profit ?? 0)
  const gpm       = Number(project.gpm ?? 0)
  const matCost   = Number(fin.material  ?? 0)
  const labCost   = Number(fin.labor     ?? 0)
  const desCost   = Number(fin.designFee ?? 0)
  const commRate  = gpm >= 73 ? 7.5 : gpm >= 65 ? 5.5 : 4.5
  const commAmt   = Number(project.commission ?? (profit * commRate / 100))

  const docColor  = DOC_COLORS[type]
  const docLabel  = DOC_LABELS[type]

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  function openSendModal() {
    setSendEmail(clientEmail || '')
    setShowSendModal(true)
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      const mapped = lineItems.map(li => ({
        name: li.description ?? 'Item', desc: li.notes ?? '',
        vehicle: project.vehicle_desc ?? '', sub: li.notes ?? '',
        bullets: [], qty: `${li.quantity ?? 1}`,
        amount: `$${Number(li.unit_price ?? li.total ?? 0).toFixed(2)}`,
        revenue: Number(li.unit_price ?? li.total ?? 0),
        material_cost: 0, labor_cost: 0, design_cost: 0,
      }))
      const subtotalStr = `$${subtotal.toFixed(2)}`

      let payload: Record<string, unknown>
      if (type === 'estimate') {
        payload = {
          ref: refStr, date: todayStr, status: 'Estimate Sent', valid_days: 30,
          client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
          client_addr: customer.address ?? '', client_zip: fd.zip ?? '98332',
          agent: agentName, install_date: installStr,
          b2b_exempt: false, exempt_cert: null,
          primary_film: 'Avery MPI 1105 EZ-RS', overlaminate: 'Avery DOL 1060',
          client_brand: {}, line_items: mapped, subtotal: subtotalStr,
          inclusions: ['12-month workmanship warranty', 'Pre & post-install vehicle photos', 'Client walkthrough & sign-off', 'Wrap care guide provided', 'Online customer portal access'],
        }
      } else if (type === 'invoice') {
        payload = {
          ref: `INV-${refStr}`, date: todayStr, due_date: 'Net 10',
          status: 'PAYMENT DUE', status_color: 'due', agent: agentName, install_date: installStr,
          client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
          client_addr: customer.address ?? '', linked_ref: refStr,
          line_items: mapped, subtotal: subtotalStr,
          tax_label: 'Sales Tax (8.1%)', tax_amount: `$${taxAmt.toFixed(2)}`,
          deposit_paid: `$${deposit.toFixed(2)}`, balance: `$${balance.toFixed(2)}`,
          payments: [],
          payment_methods: 'Credit Card  -  Check payable to USA Wrap Co  -  Pay online at portal.usawrapco.com',
          notes: `Thank you for your business, ${clientName}.`,
        }
      } else if (type === 'workorder') {
        payload = {
          ref: `WO-${refStr}`, so_ref: refStr, date: todayStr,
          status: 'READY TO INSTALL', priority: project.priority?.toUpperCase() ?? 'NORMAL',
          installer: installerName, bay: fd.bay ?? 'Bay 1',
          est_hours: String(fin.laborHrs ?? '8'), installer_pay: `$${labCost.toFixed(2)}`,
          pay_type: 'Flat Rate', client_name: clientName, client_phone: clientPhone,
          client_contact: clientName, drop_off: installStr, pick_up: installStr,
          year: fd.vehicle_year ?? '', make: fd.vehicle_make ?? '', model: fd.vehicle_model ?? '',
          color: fd.vehicle_color ?? '', vin: fd.vin ?? '', plate: fd.plate ?? '', mileage: fd.mileage ?? '',
          scope: project.title ?? 'Vehicle Wrap', material: 'Avery MPI 1105 EZ-RS  -  54" wide roll',
          sqft: String(fd.sqft ?? '0'), linear_ft: `${fd.linear_ft ?? '0'} lin ft`,
          panels: fd.panels ?? [], special_notes: fd.special_notes ?? '',
          pre_checks: [], post_checks: [],
        }
      } else {
        payload = {
          ref: `SO-${refStr}`, est_ref: refStr, date: todayStr, install_date: installStr,
          status: 'APPROVED', priority: project.priority?.toUpperCase() ?? 'NORMAL',
          division: project.division?.toUpperCase() ?? 'WRAPS',
          agent: agentName, agent_type: fd.leadType ?? 'inbound',
          installer: installerName, designer: designerName,
          client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
          client_company: customer.company_name ?? clientName,
          vehicle: project.vehicle_desc ?? '', vin: fd.vin ?? '',
          color: fd.vehicle_color ?? '', plates: fd.plate ?? '',
          scope: project.title ?? 'Vehicle Wrap', sqft: String(fd.sqft ?? '0'),
          material: 'Avery MPI 1105 EZ-RS + DOL 1460 Overlaminate',
          panels: fd.panels ?? [], sale_price: revenue, deposit_paid: deposit,
          balance_due: Math.max(0, revenue + taxAmt - deposit),
          material_cost: matCost, installer_pay: labCost, design_fee: desCost,
          production_bonus: 0, misc_cost: Number(fin.misc ?? 0),
          gross_profit: profit, gpm, gpm_target: 75, gpm_bonus_thresh: 73,
          commission_type: fd.leadType ?? 'inbound', commission_rate: commRate,
          commission_base: 4.5, commission_bonus: gpm >= 73 ? 3.0 : 0, commission_amount: commAmt,
          torq_completed: false, gpm_bonus_earned: gpm >= 73,
          line_items: mapped, agent_notes: '', prod_notes: '', internal_notes: '',
        }
      }

      const res = await fetch(`/api/pdf/${type}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${type}-${refStr}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PDF generation failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDownloading(false)
    }
  }

  async function handleSend() {
    if (!sendEmail) return
    setSending(true)
    try {
      const res  = await fetch(`/api/projects/${project.id}/send-doc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, to_email: sendEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Send failed')
      setShowSendModal(false)
      showToast(`Sent to ${sendEmail}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  // ─── Document renderers ────────────────────────────────────────────────────

  function renderEstimate() {
    return (
      <div style={{ fontFamily: 'system-ui,sans-serif', color: '#0f172a', maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <DocHeader docLabel={docLabel} docColor={docColor} refStr={refStr} />
        <MetaRow fields={[
          { label: 'Date', value: todayStr },
          { label: 'Install Date', value: installStr },
          { label: 'Agent', value: agentName || '—' },
          { label: 'Valid For', value: '30 Days' },
        ]} />

        {/* Bill To + Job Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '24px 40px', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Bill To</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{clientName}</div>
            {clientPhone && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>{clientPhone}</div>}
            {clientEmail && <div style={{ fontSize: 13, color: '#64748b' }}>{clientEmail}</div>}
          </div>
          <div style={{ padding: '24px 40px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Job Details</div>
            {project.vehicle_desc && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{project.vehicle_desc}</div>}
            {project.title && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>{project.title}</div>}
            {fd.vehicle_color && <div style={{ fontSize: 12, color: '#64748b' }}>Color: {fd.vehicle_color as string}</div>}
            {fd.vin && <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>VIN: {fd.vin as string}</div>}
          </div>
        </div>

        {/* Line Items */}
        <div style={{ padding: '24px 40px 0' }}>
          <LineItemsTable lineItems={lineItems} />
        </div>

        {/* Totals */}
        <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 280 }}>
            {[{ label: 'Subtotal', value: fM(subtotal) }, { label: 'Tax (8.1%)', value: fM(taxAmt) }].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#64748b' }}>
                <span>{r.label}</span><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 17, fontWeight: 800, borderTop: '2px solid #0f172a', marginTop: 4 }}>
              <span>TOTAL</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: docColor }}>{fM(total)}</span>
            </div>
            <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}>
              50% Deposit to Schedule: {fM(total * 0.5)}
            </div>
          </div>
        </div>

        {/* Inclusions */}
        <div style={{ padding: '20px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>What's Included</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['12-month workmanship warranty', 'Pre & post-install vehicle photos', 'Client walkthrough & sign-off', 'Wrap care guide provided', 'Online customer portal access'].map((inc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0f172a' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                {inc}
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Terms & Conditions</div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {PDF_TERMS.map((t, i) => <li key={i} style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{t}</li>)}
          </ol>
        </div>

        {/* Signature + Footer */}
        <div style={{ background: '#0f172a', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>{BRAND.name}</div>
            <div>{BRAND.address} · {BRAND.city}</div>
            <div>{BRAND.phone} · {BRAND.website}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 20 }}>Customer Acceptance</div>
            <div style={{ width: 200, borderBottom: '1px solid #374151', marginBottom: 5 }}></div>
            <div style={{ fontSize: 10, color: '#374151' }}>Signature &amp; Date</div>
          </div>
        </div>
      </div>
    )
  }

  function renderInvoice() {
    return (
      <div style={{ fontFamily: 'system-ui,sans-serif', color: '#0f172a', maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        {/* Header with status badge */}
        <div style={{ background: '#0f172a', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoUrl} alt="USA Wrap Co" style={{ height: 48, marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{BRAND.address} · {BRAND.city}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{BRAND.phone} · {BRAND.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 44, fontWeight: 900, color: docColor, letterSpacing: 2, lineHeight: 1 }}>INVOICE</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>INV-{refStr}</div>
            <div style={{ marginTop: 10, padding: '4px 14px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>PAYMENT DUE</div>
          </div>
        </div>

        <MetaRow fields={[
          { label: 'Invoice Date', value: todayStr },
          { label: 'Due', value: 'Net 10' },
          { label: 'Install Date', value: installStr },
          { label: 'Agent', value: agentName || '—' },
        ]} />

        {/* From / To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '24px 40px', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>From</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{BRAND.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{BRAND.address}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{BRAND.city}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{BRAND.phone}</div>
          </div>
          <div style={{ padding: '24px 40px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Bill To</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{clientName}</div>
            {clientPhone && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{clientPhone}</div>}
            {clientEmail && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{clientEmail}</div>}
            {project.vehicle_desc && <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: 600 }}>{project.vehicle_desc}</div>}
          </div>
        </div>

        <div style={{ padding: '24px 40px 0' }}>
          <LineItemsTable lineItems={lineItems} />
        </div>

        {/* Totals */}
        <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 300 }}>
            {[
              { label: 'Subtotal', value: fM(subtotal), color: '#64748b' },
              { label: 'Sales Tax (8.1%)', value: fM(taxAmt), color: '#64748b' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: r.color }}>
                <span>{r.label}</span><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#16a34a' }}>
              <span>Deposit Paid</span><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>({fM(deposit)})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', fontSize: 18, fontWeight: 800, borderTop: '2px solid #0f172a', marginTop: 4 }}>
              <span>BALANCE DUE</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: docColor }}>{fM(balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ padding: '16px 40px', background: '#fef9f0', borderBottom: '1px solid #fde68a' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Payment Methods</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Credit Card · Check payable to USA Wrap Co · Pay online at portal.usawrapco.com</div>
        </div>

        {/* Footer */}
        <div style={{ background: '#0f172a', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: 3 }}>Thank you for your business!</div>
            <div>{BRAND.phone} · {BRAND.website}</div>
          </div>
          <div style={{ fontSize: 11, color: '#374151' }}>{BRAND.email}</div>
        </div>
      </div>
    )
  }

  function renderWorkOrder() {
    return (
      <div style={{ fontFamily: 'system-ui,sans-serif', color: '#0f172a', maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ background: '#0f172a', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoUrl} alt="USA Wrap Co" style={{ height: 44, marginBottom: 10, filter: 'brightness(0) invert(1)' }} />
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{BRAND.address} · {BRAND.city} · {BRAND.phone}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 38, fontWeight: 900, color: docColor, letterSpacing: 2 }}>WORK ORDER</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>WO-{refStr}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700 }}>READY TO INSTALL</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700 }}>{project.priority?.toUpperCase() ?? 'NORMAL'}</span>
            </div>
          </div>
        </div>

        <MetaRow fields={[
          { label: 'Date', value: todayStr },
          { label: 'Drop-Off', value: installStr },
          { label: 'Bay', value: (fd.bay as string) ?? 'Bay 1' },
          { label: 'Est. Hours', value: `${fin.laborHrs ?? '8'} hrs` },
        ]} />

        {/* Installer + Customer/Vehicle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '24px 40px', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Assigned Installer</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{installerName || 'TBD'}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Installer Pay</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{fM(labCost)}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Flat Rate</div>
          </div>
          <div style={{ padding: '24px 40px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Customer &amp; Vehicle</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{clientName}</div>
            {clientPhone && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{clientPhone}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Year', value: (fd.vehicle_year as string) ?? '—' },
                { label: 'Make', value: (fd.vehicle_make as string) ?? '—' },
                { label: 'Model', value: (fd.vehicle_model as string) ?? '—' },
                { label: 'Color', value: (fd.vehicle_color as string) ?? '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
            {fd.vin && <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>VIN: {fd.vin as string}</div>}
          </div>
        </div>

        {/* Scope */}
        <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Scope of Work</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{project.title ?? 'Vehicle Wrap'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Material', value: 'Avery MPI 1105 EZ-RS + DOL 1060' },
              { label: 'Est. Sqft', value: `${fd.sqft ?? '0'} sq ft` },
              { label: 'Panels', value: Array.isArray(fd.panels) && fd.panels.length ? (fd.panels as string[]).join(', ') : 'Full Wrap' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Services</div>
          {lineItems.length > 0 ? lineItems.map((li, i) => (
            <div key={li.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{li.description || 'Service'}</span>
              <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{fM(Number(li.unit_price ?? li.total ?? 0))}</span>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>See sales order for details</div>
          )}
        </div>

        {/* Special Notes */}
        <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Special Notes / Instructions</div>
          <div style={{ fontSize: 13, color: '#64748b', minHeight: 48, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            {(fd.special_notes as string) || 'None'}
          </div>
        </div>

        {/* Sign-off blocks */}
        <div style={{ padding: '24px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          {['Installer Sign-Off', 'Manager Sign-Off'].map(label => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 }}>{label}</div>
              <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: 6 }}></div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Signature &amp; Date</div>
            </div>
          ))}
        </div>

        <DocFooter refStr={refStr} label="WO" />
      </div>
    )
  }

  function renderSalesOrder() {
    const isPrivileged = ['owner', 'admin'].includes(profile.role ?? '')
    return (
      <div style={{ fontFamily: 'system-ui,sans-serif', color: '#0f172a', maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ background: '#0f172a', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoUrl} alt="USA Wrap Co" style={{ height: 44, marginBottom: 10, filter: 'brightness(0) invert(1)' }} />
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{BRAND.address} · {BRAND.city} · {BRAND.phone}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 38, fontWeight: 900, color: docColor, letterSpacing: 2 }}>SALES ORDER</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>SO-{refStr}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700 }}>APPROVED</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f3f0ff', color: '#6d28d9', fontSize: 11, fontWeight: 700 }}>{project.division?.toUpperCase() ?? 'WRAPS'}</span>
            </div>
          </div>
        </div>

        <MetaRow fields={[
          { label: 'Date', value: todayStr },
          { label: 'Install Date', value: installStr },
          { label: 'Agent', value: agentName || '—' },
          { label: 'Priority', value: project.priority?.toUpperCase() ?? 'NORMAL' },
        ]} />

        {/* Customer + Team */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '24px 40px', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Customer</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{clientName}</div>
            {customer.company_name && clientName !== customer.company_name && (
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{customer.company_name}</div>
            )}
            {clientPhone && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{clientPhone}</div>}
            {clientEmail && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{clientEmail}</div>}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12 }}>Vehicle</div>
            {project.vehicle_desc && <div style={{ fontSize: 13, fontWeight: 600 }}>{project.vehicle_desc}</div>}
            {fd.vehicle_color && <div style={{ fontSize: 12, color: '#64748b' }}>Color: {fd.vehicle_color as string}</div>}
            {fd.vin && <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>VIN: {fd.vin as string}</div>}
          </div>
          <div style={{ padding: '24px 40px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Team</div>
            {[
              { role: 'Sales Agent', name: agentName },
              { role: 'Installer', name: installerName },
              { role: 'Designer', name: designerName },
            ].map(({ role, name }) => (
              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{role}</span>
                <span style={{ fontWeight: 600 }}>{name || '—'}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Material</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Avery MPI 1105 EZ-RS + DOL 1460</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{fd.sqft ?? '0'} sq ft</div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Services</div>
          <LineItemsTable lineItems={lineItems} />
        </div>

        {/* Financial (owner/admin only) */}
        {isPrivileged && (
          <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0', background: '#fafbff' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Financial Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Sale Price', value: fM(revenue), color: '#3b82f6' },
                { label: 'COGS', value: fM(matCost + labCost + desCost), color: '#64748b' },
                { label: 'Gross Profit', value: fM(profit), color: '#22c55e' },
                { label: 'GPM', value: `${gpm.toFixed(1)}%`, color: gpm >= 70 ? '#22c55e' : '#ef4444' },
                { label: 'Commission', value: fM(commAmt), color: '#8b5cf6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Deposit Paid', value: fM(deposit) },
                { label: 'Balance Due', value: fM(balance) },
                { label: 'Material Cost', value: fM(matCost) },
                { label: 'Labor Cost', value: fM(labCost) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DocFooter refStr={refStr} label="SO" />
      </div>
    )
  }

  const renderers: Record<string, () => React.JSX.Element> = {
    estimate: renderEstimate,
    invoice: renderInvoice,
    workorder: renderWorkOrder,
    salesorder: renderSalesOrder,
  }

  return (
    <>
      {/* ── Sticky Action Bar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#13151c', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#9299b5', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 8, flexShrink: 0 }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: docColor, letterSpacing: 1 }}>{docLabel}</span>
        <span style={{ fontSize: 12, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>#{refStr}</span>
        <span style={{ fontSize: 12, color: '#5a6080' }}>·</span>
        <span style={{ fontSize: 12, color: '#5a6080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</span>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.3)',
            color: '#4f7fff', padding: '7px 14px', borderRadius: 9,
            fontWeight: 700, fontSize: 12, cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {downloading
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <FileDown size={13} />}
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>

        <button
          onClick={openSendModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
            color: '#22c07a', padding: '7px 14px', borderRadius: 9,
            fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Send size={13} /> Send to Customer
        </button>
      </div>

      {/* ── Document Page ─────────────────────────────────────────────────────── */}
      <div style={{ minHeight: 'calc(100vh - 57px)', background: '#eef0f5', padding: '40px 24px 80px' }}>
        {renderers[type]?.()}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#22c07a', color: '#fff', padding: '10px 20px',
          borderRadius: 10, fontWeight: 700, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)', animation: 'fadeUp 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* ── Send Modal ────────────────────────────────────────────────────────── */}
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#13151c', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#e8eaed' }}>Send {docLabel} to Customer</div>
              <button onClick={() => setShowSendModal(false)} style={{ background: 'none', border: 'none', color: '#5a6080', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Recipient Email</div>
              <input
                type="email"
                value={sendEmail}
                onChange={e => setSendEmail(e.target.value)}
                placeholder="customer@email.com"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.1)', background: '#1a1d27',
                  color: '#e8eaed', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)', borderRadius: 8, fontSize: 12, color: '#9299b5', marginBottom: 20 }}>
              An email with {docLabel.toLowerCase()} details for <strong style={{ color: '#e8eaed' }}>{project.title || refStr}</strong> will be sent to this address.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{ flex: 1, padding: 10, borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', color: '#9299b5' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendEmail}
                style={{
                  flex: 2, padding: 10, borderRadius: 9, fontWeight: 700, fontSize: 13,
                  cursor: sending || !sendEmail ? 'not-allowed' : 'pointer',
                  background: sending || !sendEmail ? 'rgba(34,192,122,0.3)' : '#22c07a',
                  border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: !sendEmail ? 0.6 : 1,
                }}
              >
                {sending
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Mail size={14} />}
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
