'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, FileText, ShoppingCart, Receipt, Sparkles, Loader2, ChevronDown } from 'lucide-react'

interface SalesDoc {
  id: string
  title: string | null
  status: string | null
  total: number | null
  created_at: string
  number?: string | null
}

interface Props {
  projectId: string
  orgId: string
}

const fmtC = (n: number | null) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const STATUS_COLORS: Record<string, string> = {
  draft: '#9299b5', sent: '#22d3ee', accepted: '#22c07a', approved: '#22c07a',
  pending: '#f59e0b', paid: '#22c07a', partial: '#f59e0b', overdue: '#f25a5a',
  void: '#5a6080', cancelled: '#5a6080',
}

type SubTab = 'estimate' | 'sales_order' | 'invoice'

export default function JobSalesTab({ projectId, orgId }: Props) {
  const supabase = createClient()
  const [subTab, setSubTab] = useState<SubTab>('estimate')
  const [estimates, setEstimates] = useState<SalesDoc[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesDoc[]>([])
  const [invoices, setInvoices] = useState<SalesDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('estimates').select('id, title, status, total, created_at, estimate_number').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('sales_orders').select('id, title, status, total, created_at, order_number').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, title, status, total, created_at, invoice_number').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]).then(([est, so, inv]) => {
      setEstimates((est.data || []).map((d: any) => ({ ...d, number: d.estimate_number })))
      setSalesOrders((so.data || []).map((d: any) => ({ ...d, number: d.order_number })))
      setInvoices((inv.data || []).map((d: any) => ({ ...d, number: d.invoice_number })))
      setLoading(false)
    })
  }, [projectId])

  async function handleAiCompare() {
    if (aiLoading) return
    setAiLoading(true)
    setAiOpen(true)
    const estTotal = estimates[0]?.total ?? null
    const soTotal = salesOrders[0]?.total ?? null
    const invTotal = invoices[0]?.total ?? null
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze how this vehicle wrap job has changed financially from estimate to sales order to invoice:
Estimate total: ${estTotal != null ? fmtC(estTotal) : 'none'}
Sales Order total: ${soTotal != null ? fmtC(soTotal) : 'none'}
Invoice total: ${invTotal != null ? fmtC(invTotal) : 'none'}
Estimate status: ${estimates[0]?.status || 'none'}
Sales Order status: ${salesOrders[0]?.status || 'none'}
Invoice status: ${invoices[0]?.status || 'none'}
Provide a concise summary of any changes and their business significance. Keep it under 150 words.`,
          }],
        }),
      })
      const data = await res.json()
      setAiResult(data.content || data.message || data.response || 'Analysis complete.')
    } catch {
      setAiResult('Unable to generate comparison. Check AI settings.')
    } finally {
      setAiLoading(false)
    }
  }

  const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode; docs: SalesDoc[]; pdfBase: string }[] = [
    { key: 'estimate',    label: 'Estimate',    icon: <FileText size={13} />,     docs: estimates,   pdfBase: '/api/pdf/estimate' },
    { key: 'sales_order', label: 'Sales Order', icon: <ShoppingCart size={13} />, docs: salesOrders, pdfBase: '/api/pdf/quote' },
    { key: 'invoice',     label: 'Invoice',     icon: <Receipt size={13} />,      docs: invoices,    pdfBase: '/api/pdf/invoice' },
  ]

  const active = SUB_TABS.find(t => t.key === subTab)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-tab selector */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: subTab === t.key ? 'var(--accent)' : 'transparent',
              color: subTab === t.key ? '#fff' : 'var(--text2)',
            }}
          >
            {t.icon} {t.label}
            {t.docs.length > 0 && (
              <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 10, background: subTab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--surface2)', color: subTab === t.key ? '#fff' : 'var(--text3)' }}>
                {t.docs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Document list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', padding: 24 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
        </div>
      ) : active.docs.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 32, background: 'var(--surface)', borderRadius: 10 }}>
          No {active.label.toLowerCase()} linked to this job yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.docs.map(doc => {
            const statusColor = STATUS_COLORS[doc.status || ''] || '#9299b5'
            return (
              <div key={doc.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                      {doc.title || `${active.label} ${doc.number || doc.id.slice(-6)}`}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: `${statusColor}18`, color: statusColor, textTransform: 'uppercase' }}>
                      {doc.status || 'draft'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
                    {doc.number && <span>#{doc.number}</span>}
                    <span>{fmtDate(doc.created_at)}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--green)' }}>{fmtC(doc.total)}</span>
                  </div>
                </div>
                <a
                  href={`${active.pdfBase}/${doc.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                    borderRadius: 7, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  <Download size={12} /> PDF
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* AI Compare */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <button
          onClick={() => aiResult ? setAiOpen(o => !o) : handleAiCompare()}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text1)', fontSize: 13, fontWeight: 700,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Sparkles size={14} style={{ color: 'var(--purple)' }} />
            AI Compare Estimate → SO → Invoice
          </span>
          {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)', transform: aiOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
        </button>
        {aiOpen && (
          <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {aiLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--text3)' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…
              </div>
            ) : (
              <p style={{ margin: '12px 0 0' }}>{aiResult}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
