'use client'

import { useState } from 'react'
import {
  TrendingUp, DollarSign, CheckCircle, Clock, Truck, Package,
  Wrench, Search, Star, ChevronRight, Calendar,
} from 'lucide-react'

interface AffiliatePortalClientProps {
  affiliate: any
  projects: any[]
  totalEarned: number
  totalOwed: number
  totalPaid: number
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const STAGE_CONFIG: Record<string, { label: string; color: string; Icon: any; desc: string }> = {
  sales_in:    { label: 'In Sales',    color: '#4f7fff', Icon: Star,      desc: 'Your customer is being processed by our sales team' },
  production:  { label: 'Production', color: '#22c07a', Icon: Package,   desc: 'Vinyl is being printed and prepared' },
  install:     { label: 'Installing', color: '#22d3ee', Icon: Wrench,    desc: 'Wrap is being installed on the vehicle' },
  prod_review: { label: 'QC Review',  color: '#f59e0b', Icon: Search,    desc: 'Final quality check before delivery' },
  sales_close: { label: 'Closing',    color: '#8b5cf6', Icon: CheckCircle, desc: 'Final approval and paperwork' },
  done:        { label: 'Complete',   color: '#22c07a', Icon: CheckCircle, desc: 'Job complete! Commission on its way.' },
}

const STAGE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

export default function AffiliatePortalClient({
  affiliate, projects, totalEarned, totalOwed, totalPaid,
}: AffiliatePortalClientProps) {
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const stageInfo = (stage: string) => STAGE_CONFIG[stage] || STAGE_CONFIG.sales_in
  const stageIdx = (stage: string) => STAGE_ORDER.indexOf(stage)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaed', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#13151c', borderBottom: '1px solid #1a1d27', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, system-ui, sans-serif', fontSize: 22, fontWeight: 900, color: '#e8eaed', lineHeight: 1 }}>USA WRAP CO</div>
            <div style={{ fontSize: 12, color: '#9299b5', marginTop: 2 }}>Partner Portal</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed' }}>{affiliate.name}</div>
            {affiliate.company && <div style={{ fontSize: 12, color: '#9299b5' }}>{affiliate.company}</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Commission KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Earned', value: fM(totalEarned), color: '#22c07a', Icon: TrendingUp },
            { label: 'Commission Owed', value: fM(totalOwed), color: '#f59e0b', Icon: Clock },
            { label: 'Commission Paid', value: fM(totalPaid), color: '#4f7fff', Icon: DollarSign },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} color={color} />
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Commission Structure */}
        <div style={{ background: '#13151c', border: '1px solid rgba(79,127,255,.3)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f7fff', textTransform: 'uppercase', marginBottom: 8 }}>Your Commission Structure</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#9299b5' }}>
            <div>Type: <strong style={{ color: '#e8eaed' }}>{affiliate.commission_structure?.type || 'percent_gp'}</strong></div>
            <div>Rate: <strong style={{ color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>{affiliate.commission_structure?.rate || 10}%</strong></div>
            <div>Status: <strong style={{ color: affiliate.status === 'active' ? '#22c07a' : '#f25a5a' }}>{affiliate.status}</strong></div>
          </div>
        </div>

        {/* Projects */}
        <div style={{ fontFamily: 'Barlow Condensed, system-ui, sans-serif', fontSize: 20, fontWeight: 800, color: '#e8eaed', marginBottom: 14 }}>
          Your Jobs ({projects.length})
        </div>

        {projects.length === 0 && (
          <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: 40, textAlign: 'center', color: '#5a6080' }}>
            <Truck size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#9299b5', marginBottom: 8 }}>No jobs yet</div>
            <div style={{ fontSize: 13 }}>Jobs you send to USA Wrap Co will appear here</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map(p => {
            const fd = (p.form_data as any) || {}
            const stage = p.pipe_stage || 'sales_in'
            const info = stageInfo(stage)
            const curIdx = stageIdx(stage)
            const isDone = stage === 'done' || p.status === 'closed'
            const Icon = info.Icon

            return (
              <div key={p.id} onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}
                style={{ background: '#13151c', border: `1px solid ${selectedProject?.id === p.id ? '#4f7fff' : '#1a1d27'}`, borderRadius: 12, padding: 16, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', marginBottom: 2 }}>
                      {fd.client || p.title || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9299b5' }}>{fd.vehicle || p.vehicle_desc || 'Vehicle TBD'}</div>
                    {p.install_date && (
                      <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} />Install: {new Date(p.install_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: `${info.color}18`, border: `1px solid ${info.color}40` }}>
                      <Icon size={12} color={info.color} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: info.color }}>{info.label}</span>
                    </div>
                    {p.commission && (
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>
                        {fM(p.commission.amount || 0)}
                        <span style={{ fontSize: 10, fontWeight: 400, color: p.commission.status === 'paid' ? '#22c07a' : '#f59e0b', marginLeft: 6 }}>
                          {p.commission.status === 'paid' ? 'PAID' : 'PENDING'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pipeline Progress Bar */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {STAGE_ORDER.map((s, i) => {
                    const done = i < curIdx || isDone
                    const active = s === stage && !isDone
                    const stInfo = STAGE_CONFIG[s]
                    return (
                      <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: done || active ? (isDone ? '#22c07a' : stInfo?.color || '#4f7fff') : '#1a1d27', opacity: active ? 1 : done ? 0.8 : 0.3 }} />
                    )
                  })}
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#9299b5' }}>{info.desc}</div>

                {/* Expanded detail */}
                {selectedProject?.id === p.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a1d27' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#e8eaed', marginBottom: 10 }}>Pipeline Progress</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {STAGE_ORDER.filter(s => s !== 'done').map((s, i) => {
                        const done = i < curIdx
                        const active = s === stage
                        const sInfo = STAGE_CONFIG[s]
                        const SIcon = sInfo?.Icon || CheckCircle
                        return (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: active ? `${sInfo?.color || '#4f7fff'}10` : 'transparent', border: active ? `1px solid ${sInfo?.color || '#4f7fff'}30` : '1px solid transparent' }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#22c07a20' : active ? `${sInfo?.color || '#4f7fff'}20` : '#1a1d27', border: `1px solid ${done ? '#22c07a' : active ? sInfo?.color || '#4f7fff' : '#1a1d27'}` }}>
                              {done ? <CheckCircle size={12} color="#22c07a" /> : <SIcon size={12} color={active ? sInfo?.color || '#4f7fff' : '#5a6080'} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: done || active ? 700 : 400, color: done ? '#22c07a' : active ? sInfo?.color || '#4f7fff' : '#5a6080' }}>{sInfo?.label || s}</div>
                              {active && <div style={{ fontSize: 11, color: '#9299b5' }}>{sInfo?.desc}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, padding: '16px 0', borderTop: '1px solid #1a1d27', textAlign: 'center', fontSize: 12, color: '#5a6080' }}>
          Questions? Contact USA Wrap Co · <a href="mailto:team@usawrapco.com" style={{ color: '#4f7fff' }}>team@usawrapco.com</a>
        </div>
      </div>
    </div>
  )
}
