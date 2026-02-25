'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Award,
  Star,
  Gift,
  Crown,
  TrendingUp,
  ArrowLeft,
  LogOut,
  User,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  userId: string
  userEmail: string
}

interface LoyaltyTier {
  key: string
  label: string
  color: string
  minSpend: number
  icon: typeof Star
  benefits: string[]
}

interface PointsEntry {
  id: string
  date: string
  jobTitle: string
  points: number
}

interface Redemption {
  id: string
  points_redeemed: number
  dollar_value: number
  status: string
  created_at: string
}

// ─── Tiers ─────────────────────────────────────────────────────────────────────
const TIERS: LoyaltyTier[] = [
  {
    key: 'bronze',
    label: 'Bronze',
    color: '#cd7f32',
    minSpend: 0,
    icon: Award,
    benefits: ['Standard service'],
  },
  {
    key: 'silver',
    label: 'Silver',
    color: '#c0c0c0',
    minSpend: 5000,
    icon: Star,
    benefits: ['Free design revision', 'Priority scheduling'],
  },
  {
    key: 'gold',
    label: 'Gold',
    color: '#f59e0b',
    minSpend: 15000,
    icon: Gift,
    benefits: ['Free removal on next job', 'Dedicated account manager'],
  },
  {
    key: 'platinum',
    label: 'Platinum',
    color: '#8b5cf6',
    minSpend: 30000,
    icon: Crown,
    benefits: ['5% discount all jobs', 'Free ceramic coating annually'],
  },
]

// ─── Styles ────────────────────────────────────────────────────────────────────
const clr = {
  bg: '#0d0f14',
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
}

const headingFont = "'Barlow Condensed', sans-serif"
const monoFont = "'JetBrains Mono', monospace"

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PortalLoyaltyClient({ userId, userEmail }: Props) {
  const [loading, setLoading] = useState(true)
  const [totalSpend, setTotalSpend] = useState(0)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [pointsHistory, setPointsHistory] = useState<PointsEntry[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get paid invoices for this customer (points = total dollars spent)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, title, total, created_at, status')
        .eq('customer_id', userId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })

      const spend = (invoices || []).reduce((s, inv) => s + (inv.total || 0), 0)
      setTotalSpend(spend)

      // Build points history from paid invoices
      const history: PointsEntry[] = (invoices || []).map((inv: any) => ({
        id: inv.id,
        date: inv.created_at,
        jobTitle: inv.title || 'Invoice Payment',
        points: Math.floor(inv.total || 0),
      }))
      setPointsHistory(history)

      // Get redemptions
      const { data: redemptionData } = await supabase
        .from('loyalty_redemptions')
        .select('id, points_redeemed, dollar_value, status, created_at')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      const reds = redemptionData || []
      setRedemptions(reds)

      // Calculate points balance
      const totalEarned = Math.floor(spend)
      const totalRedeemed = reds
        .filter((r: any) => r.status !== 'denied')
        .reduce((s: number, r: any) => s + r.points_redeemed, 0)
      setPointsBalance(totalEarned - totalRedeemed)
    } catch (err) {
      console.error('Loyalty load error:', err)
    }
    setLoading(false)
  }

  // Calculate current tier
  const currentTier = (() => {
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (totalSpend >= TIERS[i].minSpend) return TIERS[i]
    }
    return TIERS[0]
  })()

  const nextTier = (() => {
    const idx = TIERS.findIndex(t => t.key === currentTier.key)
    return idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  })()

  const progressPct = nextTier
    ? Math.min(100, ((totalSpend - currentTier.minSpend) / (nextTier.minSpend - currentTier.minSpend)) * 100)
    : 100

  const spendToNext = nextTier ? nextTier.minSpend - totalSpend : 0

  const handleRedeem = async () => {
    if (pointsBalance < 500) return
    setRedeeming(true)
    try {
      const { error } = await supabase.from('loyalty_redemptions').insert({
        org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
        customer_id: userId,
        points_redeemed: 500,
        dollar_value: 50,
        status: 'pending',
      })
      if (!error) {
        setPointsBalance(prev => prev - 500)
        setRedeemSuccess(true)
        setTimeout(() => setRedeemSuccess(false), 4000)
        loadData()
      }
    } catch (err) {
      console.error('Redeem error:', err)
    }
    setRedeeming(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const TierIcon = currentTier.icon

  return (
    <div style={{ minHeight: '100vh', background: clr.bg, color: clr.text1, fontFamily: "'Inter', sans-serif" }}>
      {/* ─── Top Nav ──────────────────────────────────────────────────── */}
      <div style={{
        background: clr.surface,
        borderBottom: `1px solid ${clr.border}`,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => router.push('/portal')}
            style={{
              background: 'transparent',
              border: `1px solid ${clr.border}`,
              borderRadius: 8,
              padding: '8px 10px',
              color: clr.text2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            fontFamily: headingFont,
            letterSpacing: '-0.01em',
            color: clr.text1,
          }}>
            USA WRAP CO
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `${clr.accent}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={16} style={{ color: clr.accent }} />
          </div>
          <button onClick={handleSignOut} style={{
            background: 'transparent', border: `1px solid ${clr.border}`,
            borderRadius: 8, padding: '8px 14px', color: clr.text2,
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: clr.text3 }}>Loading...</div>
        ) : (
          <>
            {/* ─── Tier Hero Card ────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 16,
              padding: '28px',
              marginBottom: 24,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, height: 4,
                background: `linear-gradient(90deg, ${currentTier.color}, ${currentTier.color}80)`,
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `${currentTier.color}15`,
                  border: `2px solid ${currentTier.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TierIcon size={28} style={{ color: currentTier.color }} />
                </div>
                <div>
                  <div style={{
                    fontSize: 12, fontWeight: 800, color: clr.text3,
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2,
                  }}>
                    Current Tier
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 900, fontFamily: headingFont,
                    color: currentTier.color, textTransform: 'uppercase', letterSpacing: '0.02em',
                  }}>
                    {currentTier.label}
                  </div>
                </div>
              </div>

              {/* Progress to next tier */}
              {nextTier ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: clr.text2, fontWeight: 600 }}>
                      Progress to {nextTier.label}
                    </span>
                    <span style={{ fontSize: 12, fontFamily: monoFont, color: clr.text2 }}>
                      {fmt(spendToNext)} to go
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: 10, background: clr.surface2,
                    borderRadius: 5, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progressPct}%`, height: '100%',
                      background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                      borderRadius: 5, transition: 'width 0.5s',
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 6,
                    fontSize: 10, color: clr.text3, fontFamily: monoFont,
                  }}>
                    <span>{fmt(currentTier.minSpend)}</span>
                    <span>{fmt(nextTier.minSpend)}</span>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: `${clr.purple}10`,
                  border: `1px solid ${clr.purple}30`, borderRadius: 10, marginBottom: 20,
                }}>
                  <Sparkles size={16} style={{ color: clr.purple }} />
                  <span style={{ fontSize: 13, color: clr.purple, fontWeight: 700 }}>
                    You have reached the highest tier!
                  </span>
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ padding: '14px 16px', background: clr.surface2, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Lifetime Spend
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: monoFont, color: clr.green }}>
                    {fmt(totalSpend)}
                  </div>
                </div>
                <div style={{ padding: '14px 16px', background: clr.surface2, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Points Balance
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: monoFont, color: clr.accent }}>
                    {pointsBalance.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '14px 16px', background: clr.surface2, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Points Earned
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: monoFont, color: clr.amber }}>
                    {Math.floor(totalSpend).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Redeem Points ──────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Zap size={18} style={{ color: clr.amber }} />
                <span style={{ fontSize: 16, fontWeight: 900, fontFamily: headingFont, color: clr.text1 }}>
                  Redeem Points
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: clr.surface2, borderRadius: 10, marginBottom: 12,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: clr.text1 }}>500 points = $50 off</div>
                  <div style={{ fontSize: 12, color: clr.text3, marginTop: 2 }}>Applied as credit to your next job</div>
                </div>
                <button
                  onClick={handleRedeem}
                  disabled={pointsBalance < 500 || redeeming}
                  style={{
                    padding: '10px 20px', borderRadius: 8, border: 'none',
                    cursor: pointsBalance >= 500 && !redeeming ? 'pointer' : 'not-allowed',
                    fontSize: 13, fontWeight: 800, fontFamily: headingFont,
                    background: pointsBalance >= 500 ? clr.green : clr.surface2,
                    color: pointsBalance >= 500 ? '#0d1a10' : clr.text3,
                    opacity: redeeming ? 0.6 : 1,
                  }}
                >
                  {redeeming ? 'Redeeming...' : 'Redeem 500 pts'}
                </button>
              </div>
              {redeemSuccess && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: `${clr.green}10`,
                  border: `1px solid ${clr.green}30`, borderRadius: 8,
                }}>
                  <CheckCircle2 size={16} style={{ color: clr.green }} />
                  <span style={{ fontSize: 12, color: clr.green, fontWeight: 700 }}>
                    Redemption submitted! Our team will apply the $50 credit to your next job.
                  </span>
                </div>
              )}
              {pointsBalance < 500 && !redeemSuccess && (
                <div style={{ fontSize: 12, color: clr.text3 }}>
                  You need {(500 - pointsBalance).toLocaleString()} more points to redeem. Keep wrapping!
                </div>
              )}
            </div>

            {/* ─── Tier Benefits ──────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 900, fontFamily: headingFont,
                color: clr.text1, marginBottom: 16,
              }}>
                Tier Benefits
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TIERS.map(tier => {
                  const isActive = tier.key === currentTier.key
                  const isUnlocked = totalSpend >= tier.minSpend
                  const Icon = tier.icon
                  return (
                    <div key={tier.key} style={{
                      padding: '14px 18px',
                      background: isActive ? `${tier.color}08` : clr.surface2,
                      border: `1px solid ${isActive ? `${tier.color}40` : clr.border}`,
                      borderRadius: 10,
                      opacity: isUnlocked ? 1 : 0.5,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Icon size={18} style={{ color: tier.color }} />
                          <span style={{
                            fontSize: 14, fontWeight: 800, fontFamily: headingFont,
                            color: tier.color, textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {tier.label}
                          </span>
                          {isActive && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '2px 8px',
                              borderRadius: 4, background: `${tier.color}20`, color: tier.color,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                              Current
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontFamily: monoFont, color: clr.text3 }}>
                          {fmt(tier.minSpend)}+
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tier.benefits.map(b => (
                          <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 size={12} style={{ color: isUnlocked ? clr.green : clr.text3 }} />
                            <span style={{ fontSize: 12, color: isUnlocked ? clr.text2 : clr.text3 }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ─── Points History ─────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingUp size={18} style={{ color: clr.accent }} />
                <span style={{ fontSize: 16, fontWeight: 900, fontFamily: headingFont, color: clr.text1 }}>
                  Points History
                </span>
              </div>

              {pointsHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Clock size={32} style={{ color: clr.text3, marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: clr.text2 }}>
                    No points earned yet. Your points will appear here after your first paid invoice.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Date', 'Job', 'Points Earned'].map(h => (
                          <th key={h} style={{
                            textAlign: h === 'Points Earned' ? 'right' : 'left',
                            padding: '8px 12px', fontSize: 10, fontWeight: 800,
                            color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em',
                            borderBottom: `1px solid ${clr.border}`,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pointsHistory.map(entry => (
                        <tr key={entry.id}>
                          <td style={{
                            padding: '10px 12px', fontSize: 12, color: clr.text3,
                            borderBottom: `1px solid ${clr.surface2}`, fontFamily: monoFont,
                          }}>
                            {fmtDate(entry.date)}
                          </td>
                          <td style={{
                            padding: '10px 12px', fontSize: 13, color: clr.text1,
                            borderBottom: `1px solid ${clr.surface2}`, fontWeight: 600,
                          }}>
                            {entry.jobTitle}
                          </td>
                          <td style={{
                            padding: '10px 12px', fontSize: 13, color: clr.green,
                            borderBottom: `1px solid ${clr.surface2}`, fontFamily: monoFont,
                            fontWeight: 800, textAlign: 'right',
                          }}>
                            +{entry.points.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Redemption history */}
              {redemptions.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 800, color: clr.text3,
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                  }}>
                    Redemptions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {redemptions.map(r => (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: clr.surface2, borderRadius: 8,
                      }}>
                        <div>
                          <span style={{ fontSize: 13, color: clr.text1, fontWeight: 600 }}>
                            -{r.points_redeemed.toLocaleString()} pts
                          </span>
                          <span style={{ fontSize: 12, color: clr.text3, marginLeft: 10 }}>
                            {fmtDate(r.created_at)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontFamily: monoFont, color: clr.green, fontWeight: 800 }}>
                            {fmt(r.dollar_value)}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                            textTransform: 'uppercase',
                            background: r.status === 'applied' ? `${clr.green}20` : r.status === 'denied' ? `${clr.red}20` : `${clr.amber}20`,
                            color: r.status === 'applied' ? clr.green : r.status === 'denied' ? clr.red : clr.amber,
                          }}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
