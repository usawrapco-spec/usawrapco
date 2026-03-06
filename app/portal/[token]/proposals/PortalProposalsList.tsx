'use client'

import Link from 'next/link'
import { usePortal } from '@/lib/portal-context'
import { C, money, fmt } from '@/lib/portal-theme'
import {
  FileText, CheckCircle2, Eye, Clock, XCircle, ChevronRight, AlertTriangle,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  sent:     { label: 'Awaiting Review', color: C.amber,  icon: Clock },
  viewed:   { label: 'Reviewed',        color: C.accent, icon: Eye },
  accepted: { label: 'Accepted',        color: C.green,  icon: CheckCircle2 },
  declined: { label: 'Declined',        color: C.red,    icon: XCircle },
  expired:  { label: 'Expired',         color: C.text3,  icon: AlertTriangle },
}

interface Props {
  proposals: any[]
  portalToken: string
}

export default function PortalProposalsList({ proposals, portalToken }: Props) {
  const { customer } = usePortal()
  const base = `/portal/${portalToken}`

  if (proposals.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Proposals
        </h2>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: C.text3, fontSize: 14 }}>
          No proposals yet. When your sales rep sends you a proposal, it will appear here.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, marginBottom: 16, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Proposals
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {proposals.map((p: any) => {
          const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.sent
          const Icon = cfg.icon
          const est = p.estimate as any
          const fd = est?.form_data || {}
          const vehicle = [fd.vehicleYear || fd.year, fd.vehicleMake || fd.make, fd.vehicleModel || fd.model].filter(Boolean).join(' ')
          const total = est?.total || 0
          const estNum = est?.estimate_number ? `EST-${String(est.estimate_number).padStart(4, '0')}` : null
          const needsAction = p.status === 'sent' || p.status === 'viewed'

          return (
            <Link
              key={p.id}
              href={`${base}/proposals/${p.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: needsAction ? 'rgba(79,127,255,0.06)' : C.surface,
                border: `1px solid ${needsAction ? 'rgba(79,127,255,0.3)' : C.border}`,
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${cfg.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={18} style={{ color: cfg.color }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>
                    {p.title || 'Vehicle Wrap Proposal'}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: `${cfg.color}20`, color: cfg.color,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.text2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {vehicle && <span>{vehicle}</span>}
                  {estNum && <span>{estNum}</span>}
                  {total > 0 && <span style={{ fontWeight: 600, color: C.text1 }}>{money(total)}</span>}
                  <span>{fmt(p.sent_at || p.created_at)}</span>
                </div>
              </div>

              {/* Action hint */}
              {needsAction && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: C.accent,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>
                  Review
                </span>
              )}
              <ChevronRight size={16} style={{ color: C.text3, flexShrink: 0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
