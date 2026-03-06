'use client'

import { C, money, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import { ChevronRight, Plus, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface Referral {
  id: string
  customer_name: string | null
  vehicle_desc: string | null
  status: string
  commission_amount: number | null
  commission_pct: number | null
  created_at: string
  project_id: string | null
  paid: boolean
  notes: string | null
}

interface Props {
  token: string
  defaultCommission: number
  referrals: Referral[]
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  lead:        { label: 'New Lead',        color: C.text2 },
  estimate:    { label: 'Estimating',      color: C.accent },
  deposit:     { label: 'Deposit In',      color: C.cyan },
  production:  { label: 'In Production',   color: C.purple },
  complete:    { label: 'Complete',        color: C.green },
  paid:        { label: 'Commission Paid', color: C.green },
}

const ALL_FILTERS = ['all', 'active', 'complete', 'paid'] as const
type Filter = typeof ALL_FILTERS[number]

export default function DealerJobsList({ token, defaultCommission, referrals }: Props) {
  const base = `/portal/dealer/${token}`

  const filtered = (filter: Filter) => {
    if (filter === 'all') return referrals
    if (filter === 'active') return referrals.filter(r => !['complete', 'paid'].includes(r.status))
    if (filter === 'complete') return referrals.filter(r => r.status === 'complete')
    if (filter === 'paid') return referrals.filter(r => r.paid)
    return referrals
  }

  const totalPending = referrals
    .filter(r => r.status === 'complete' && !r.paid && r.commission_amount)
    .reduce((s, r) => s + (r.commission_amount ?? 0), 0)

  const totalEarned = referrals
    .filter(r => r.paid && r.commission_amount)
    .reduce((s, r) => s + (r.commission_amount ?? 0), 0)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Clock size={14} color={C.amber} />
            <span style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8 }}>Pending Pay</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.amber, fontFamily: 'JetBrains Mono, monospace' }}>
            {money(totalPending)}
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <DollarSign size={14} color={C.green} />
            <span style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8 }}>Total Earned</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.green, fontFamily: 'JetBrains Mono, monospace' }}>
            {money(totalEarned)}
          </div>
        </div>
      </div>

      {/* New referral CTA */}
      <Link href={`${base}/mockup`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 20 }}>
        <div style={{
          background: `${C.green}12`, border: `1px solid ${C.green}30`,
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Plus size={20} color={C.green} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.green }}>Refer a New Customer</span>
          <ChevronRight size={16} color={C.green} style={{ marginLeft: 'auto' }} />
        </div>
      </Link>

      {/* Jobs list */}
      {referrals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3 }}>
          <CheckCircle2 size={32} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 13 }}>No referrals yet — send your first one above</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {referrals.map(r => {
            const meta = STATUS_META[r.status] ?? STATUS_META.lead
            return (
              <Link key={r.id} href={`${base}/jobs/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: meta.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${meta.color}60`,
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>
                      {r.customer_name || 'Unnamed Customer'}
                    </div>
                    {r.vehicle_desc && (
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{r.vehicle_desc}</div>
                    )}
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{fmt(r.created_at)}</div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                    {r.commission_amount != null && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: r.paid ? C.green : C.text2, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                        {money(r.commission_amount)}
                      </div>
                    )}
                    {r.paid && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 }}>
                        <CheckCircle2 size={10} color={C.green} />
                        <span style={{ fontSize: 10, color: C.green }}>Paid</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={16} color={C.text3} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
