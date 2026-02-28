'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, ShoppingCart, Receipt, CreditCard, Briefcase, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RelatedDoc {
  id: string
  label: string
  status: string
  amount: number | null
  date: string | null
  href: string
}

interface CustomerJob {
  id: string
  title: string
  status: string
  pipe_stage: string | null
  revenue: number | null
  created_at: string
}

interface Props {
  projectId: string | null | undefined
  customerId: string | null | undefined
  currentDocId?: string        // exclude self from lists
  currentDocType?: 'estimate' | 'invoice' | 'sales_order'
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (['paid', 'completed', 'accepted', 'closed'].includes(s)) return { color: '#22c07a', bg: '#22c07a18', label: s }
  if (['overdue', 'declined', 'cancelled'].includes(s)) return { color: '#f25a5a', bg: '#f25a5a18', label: s }
  if (['sent', 'active', 'in_progress', 'viewed'].includes(s)) return { color: '#4f7fff', bg: '#4f7fff18', label: s }
  if (s === 'void') return { color: '#5a6080', bg: '#5a608018', label: s, strikethrough: true }
  return { color: '#9299b5', bg: '#9299b518', label: s }
}

function pipeLabel(stage: string | null) {
  const map: Record<string, string> = {
    sales_in: 'Sales', production: 'Production', install: 'Install',
    prod_review: 'QC', sales_close: 'Close', done: 'Done',
  }
  return stage ? (map[stage] || stage) : 'New'
}

const fmtCur = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'

export default function RelatedDocsPanel({ projectId, customerId, currentDocId, currentDocType }: Props) {
  const supabase = createClient()
  const [estimates, setEstimates] = useState<RelatedDoc[]>([])
  const [salesOrders, setSalesOrders] = useState<RelatedDoc[]>([])
  const [invoices, setInvoices] = useState<RelatedDoc[]>([])
  const [payments, setPayments] = useState<RelatedDoc[]>([])
  const [otherJobs, setOtherJobs] = useState<CustomerJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId && !customerId) { setLoading(false); return }
    const fetchAll = async () => {
      const pid = projectId
      const cid = customerId

      const promises: Promise<void>[] = []

      if (pid) {
        if (currentDocType !== 'estimate') {
          promises.push((async () => {
            const { data } = await supabase.from('estimates').select('id, estimate_number, status, total, created_at').eq('project_id', pid)
            setEstimates((data || []).filter((d: any) => d.id !== currentDocId).map((d: any) => ({
              id: d.id, label: `EST-${d.estimate_number || d.id.slice(0, 6)}`,
              status: d.status || 'draft', amount: d.total, date: d.created_at, href: `/estimates/${d.id}`,
            })))
          })())
        }
        if (currentDocType !== 'sales_order') {
          promises.push((async () => {
            const { data } = await supabase.from('sales_orders').select('id, so_number, status, total, created_at, est:estimate_id!inner(project_id)').eq('est.project_id', pid)
            setSalesOrders((data || []).filter((d: any) => d.id !== currentDocId).map((d: any) => ({
              id: d.id, label: `SO-${d.so_number || d.id.slice(0, 6)}`,
              status: d.status || 'new', amount: d.total, date: d.created_at, href: `/sales-orders/${d.id}`,
            })))
          })())
        }
        if (currentDocType !== 'invoice') {
          promises.push((async () => {
            const { data } = await supabase.from('invoices').select('id, invoice_number, status, total, created_at').eq('project_id', pid)
            setInvoices((data || []).filter((d: any) => d.id !== currentDocId).map((d: any) => ({
              id: d.id, label: `INV-${d.invoice_number || d.id.slice(0, 6)}`,
              status: d.status || 'draft', amount: d.total, date: d.created_at, href: `/invoices/${d.id}`,
            })))
          })())
        }
        if (currentDocId) {
          promises.push((async () => {
            const { data } = await supabase.from('payments').select('id, amount, payment_date, method')
              .eq('invoice_id', currentDocId).order('payment_date', { ascending: false })
            setPayments((data || []).map((p: any) => ({
              id: p.id, label: `${p.method || 'Payment'}`, status: 'paid',
              amount: p.amount, date: p.payment_date,
              href: currentDocType === 'invoice' ? '#payments' : '#',
            })))
          })())
        }
      }

      if (cid) {
        promises.push((async () => {
          const { data } = await supabase.from('projects')
            .select('id, title, status, pipe_stage, revenue, created_at')
            .eq('customer_id', cid)
            .neq('id', pid || 'none')
            .order('created_at', { ascending: false })
            .limit(5)
          setOtherJobs(data || [])
        })())
      }

      await Promise.all(promises)
      setLoading(false)
    }
    fetchAll()
  }, [projectId, customerId])

  if (loading) return null
  if (!estimates.length && !salesOrders.length && !invoices.length && !payments.length && !otherJobs.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Related Documents */}
      {(estimates.length > 0 || salesOrders.length > 0 || invoices.length > 0 || payments.length > 0) && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            fontFamily: 'Barlow Condensed, sans-serif',
          }}>
            Related Documents
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {estimates.map(doc => <DocRow key={doc.id} doc={doc} icon={<FileText size={12} />} color="#4f7fff" />)}
            {salesOrders.map(doc => <DocRow key={doc.id} doc={doc} icon={<ShoppingCart size={12} />} color="#22c07a" />)}
            {invoices.map(doc => <DocRow key={doc.id} doc={doc} icon={<Receipt size={12} />} color="#f59e0b" />)}
            {payments.map(doc => <DocRow key={doc.id} doc={doc} icon={<CreditCard size={12} />} color="#8b5cf6" />)}
          </div>
        </div>
      )}

      {/* Other Jobs for Customer */}
      {otherJobs.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            fontFamily: 'Barlow Condensed, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Briefcase size={11} /> Other Jobs — Same Customer
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {otherJobs.map(job => {
              const stage = job.pipe_stage || job.status || 'new'
              const sb = statusBadge(stage)
              return (
                <Link
                  key={job.id}
                  href={`/projects/${job.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', borderRadius: 8,
                    background: 'var(--bg)', textDecoration: 'none',
                    border: '1px solid var(--surface2)',
                  }}
                >
                  <span style={{
                    padding: '2px 7px', borderRadius: 10,
                    background: sb.bg, color: sb.color,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {pipeLabel(job.pipe_stage)}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text1)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {job.title || 'Untitled'}
                  </span>
                  {job.revenue != null && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                      {fmtCur(job.revenue)}
                    </span>
                  )}
                </Link>
              )
            })}
            {customerId && (
              <Link
                href={`/customers/${customerId}`}
                style={{
                  fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 4,
                  marginTop: 4, fontWeight: 600,
                }}
              >
                View all <ChevronRight size={13} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, icon, color }: { doc: RelatedDoc; icon: React.ReactNode; color: string }) {
  const sb = statusBadge(doc.status)
  return (
    <Link
      href={doc.href}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px', borderRadius: 8,
        background: 'var(--bg)', textDecoration: 'none',
        border: '1px solid var(--surface2)',
      }}
    >
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap' }}>
        {doc.label}
      </span>
      {doc.amount != null && (
        <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0 }}>
          {fmtCur(doc.amount)}
        </span>
      )}
      <span style={{
        padding: '2px 7px', borderRadius: 10,
        background: sb.bg, color: sb.color,
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', flexShrink: 0,
        textDecoration: (sb as any).strikethrough ? 'line-through' : 'none',
      }}>
        {sb.label}
      </span>
    </Link>
  )
}
