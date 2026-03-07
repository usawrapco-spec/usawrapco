'use client'

import { C, money, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  ChevronRight, TrendingUp, Wand2, Compass, Map,
  Briefcase, DollarSign, Clock, CheckCircle2, Plus,
  Rocket, Gift,
} from 'lucide-react'
import type { DealerCtx } from './DealerPortalShell'

export interface DealerReferral {
  id: string
  customer_name: string | null
  vehicle_desc: string | null
  status: string
  commission_amount: number | null
  commission_pct: number | null
  created_at: string
  project_id: string | null
}

interface Props {
  ctx: DealerCtx
  referrals: DealerReferral[]
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  lead:        { label: 'New Lead',        color: C.text2 },
  estimate:    { label: 'Estimating',      color: C.accent },
  deposit:     { label: 'Deposit In',      color: C.cyan },
  production:  { label: 'In Production',   color: C.purple },
  complete:    { label: 'Complete',        color: C.green },
  paid:        { label: 'Commission Paid', color: C.green },
}

export default function DealerHome({ ctx, referrals }: Props) {
  const base = `/portal/dealer/${ctx.token}`
  const features = ctx.portal_features

  const totalRevenue = referrals.reduce((s, r) => {
    if (r.commission_amount) return s + r.commission_amount
    return s
  }, 0)

  const active = referrals.filter(r => !['complete', 'paid'].includes(r.status))
  const completed = referrals.filter(r => ['complete', 'paid'].includes(r.status))
  const unpaidCommission = referrals
    .filter(r => r.status === 'complete' && r.commission_amount)
    .reduce((s, r) => s + (r.commission_amount ?? 0), 0)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Active', value: active.length.toString(), icon: Briefcase, color: C.accent },
          { label: 'Done', value: completed.length.toString(), icon: CheckCircle2, color: C.green },
          { label: 'Owed', value: unpaidCommission > 0 ? money(unpaidCommission) : '$0', icon: DollarSign, color: C.amber },
        ].map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '14px 10px', textAlign: 'center',
          }}>
            <s.icon size={18} color={s.color} strokeWidth={1.6} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── START NEW REFERRAL ─────────────────────────────────────────────── */}
      <Link href={`${base}/mockup`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,192,122,0.15) 0%, rgba(79,127,255,0.10) 100%)',
          border: '1px solid rgba(34,192,122,0.3)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(34,192,122,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Plus size={24} color={C.green} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>Refer a New Customer</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
              Build a mockup{ctx.share_estimates ? ', get an instant estimate,' : ''} and earn commission
            </div>
          </div>
          <ChevronRight size={20} color={C.green} />
        </div>
      </Link>

      {/* ── ACTIVE REFERRALS ──────────────────────────────────────────────── */}
      {active.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Active Jobs
            </h2>
            <Link href={`${base}/jobs`} style={{ fontSize: 11, color: C.green, textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.slice(0, 4).map(r => {
              const meta = STATUS_META[r.status] ?? STATUS_META.lead
              return (
                <Link key={r.id} href={`${base}/jobs/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
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
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                      {r.commission_amount && (
                        <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                          {money(r.commission_amount)}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} color={C.text3} />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── MESSAGES ──────────────────────────────────────────────────────── */}
      {features.messaging && <Link href={`${base}/messages`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 24 }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 2 }}>
              3-Way Project Messaging
            </div>
            <div style={{ fontSize: 12, color: C.text2 }}>
              Chat directly with the shop, your customer, or start a group thread
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            {ctx.unread_shop + ctx.unread_customer + ctx.unread_group > 0 && (
              <span style={{
                background: '#f25a5a', color: '#fff', borderRadius: 10,
                padding: '2px 8px', fontSize: 11, fontWeight: 700,
              }}>
                {ctx.unread_shop + ctx.unread_customer + ctx.unread_group} new
              </span>
            )}
            <ChevronRight size={18} color={C.text3} />
          </div>
        </div>
      </Link>}

      {/* ── PRIMARY APP HERO ──────────────────────────────────────────────── */}
      {ctx.primary_app === 'pnw_navigator' && features.pnw_navigator && (
        <Link href={`${base}/explorer`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 24 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(79,127,255,0.12) 100%)',
            border: '1px solid rgba(34,211,238,0.35)',
            borderRadius: 16, padding: '24px 20px',
            display: 'flex', alignItems: 'center', gap: 18,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(34,211,238,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Compass size={28} color={C.cyan} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
                PNW Navigator
              </div>
              <div style={{ fontSize: 13, color: C.text2, marginTop: 3, lineHeight: 1.4 }}>
                Boat ramps, marinas, fishing zones, weather, tides & AI trip planner
              </div>
            </div>
            <ChevronRight size={20} color={C.cyan} />
          </div>
        </Link>
      )}

      {/* ── FEATURED APPS ─────────────────────────────────────────────────── */}
      {(features.mockup_generator || (features.pnw_navigator && ctx.primary_app !== 'pnw_navigator') || features.fleet_manager) && (
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Featured Apps
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {features.mockup_generator && (
          <Link href={`${base}/mockup`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,192,122,0.10) 0%, rgba(79,127,255,0.06) 100%)',
              border: '1px solid rgba(34,192,122,0.22)',
              borderRadius: 14, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <Wand2 size={22} color={C.green} strokeWidth={1.6} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Vehicle Mockup Generator</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>Design & quote in 60 seconds</div>
              </div>
              <ChevronRight size={16} color={C.text3} />
            </div>
          </Link>
          )}

          {features.pnw_navigator && ctx.primary_app !== 'pnw_navigator' && (
          <Link href={`${base}/explorer`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.10) 0%, rgba(79,127,255,0.06) 100%)',
              border: '1px solid rgba(34,211,238,0.22)',
              borderRadius: 14, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <Compass size={22} color={C.cyan} strokeWidth={1.6} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>PNW Navigator</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>Boat ramps, marinas & scenic routes</div>
              </div>
              <ChevronRight size={16} color={C.text3} />
            </div>
          </Link>
          )}

          {features.fleet_manager && (
          <Link href={`${base}/fleet`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(79,127,255,0.06) 100%)',
              border: '1px solid rgba(139,92,246,0.22)',
              borderRadius: 14, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <Map size={22} color={C.purple} strokeWidth={1.6} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Fleet Manager</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>Track your wrapped vehicles & impressions</div>
              </div>
              <ChevronRight size={16} color={C.text3} />
            </div>
          </Link>
          )}

        </div>
      </section>
      )}

      {/* ── FINANCING & REFERRALS ────────────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Link href={`${base}/financing`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '16px 14px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <Rocket size={20} color={C.purple} strokeWidth={1.8} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Financing</span>
              <span style={{ fontSize: 11, color: C.text3 }}>LaunchPay for customers</span>
            </div>
          </Link>
          <Link href={`${base}/referrals`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '16px 14px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <Gift size={20} color={C.green} strokeWidth={1.8} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Referrals</span>
              <span style={{ fontSize: 11, color: C.text3 }}>Share & earn commission</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Empty state */}
      {referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: C.text3 }}>
          <TrendingUp size={32} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: C.text2, marginBottom: 6 }}>No referrals yet</div>
          <div style={{ fontSize: 12 }}>Refer your first customer and start earning commission</div>
        </div>
      )}
    </div>
  )
}
