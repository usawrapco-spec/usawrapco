'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Share2,
  Copy,
  CheckCircle2,
  Users,
  DollarSign,
  ArrowLeft,
  LogOut,
  User,
  Clock,
  Mail,
  MessageSquare,
  Link2,
  TrendingUp,
  Zap,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  userId: string
  userEmail: string
}

interface ReferralEntry {
  id: string
  referred_by_name: string
  referred_customer_id: string | null
  status: 'pending' | 'converted' | 'paid'
  conversion_value: number
  commission_paid: number
  converted_at: string | null
  paid_at: string | null
  created_at: string
  payout_requested: boolean
}

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
  cyan: '#22d3ee',
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
export default function PortalReferralsClient({ userId, userEmail }: Props) {
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralCodeId, setReferralCodeId] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [affiliateUnlocked, setAffiliateUnlocked] = useState(false)
  const [affiliateCommissionPct, setAffiliateCommissionPct] = useState(5)
  const [payoutRequesting, setPayoutRequesting] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get referral code for this customer
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('id, code, affiliate_unlocked, affiliate_commission_pct')
        .eq('owner_id', userId)
        .eq('type', 'customer')
        .single()

      if (codeData) {
        setReferralCode(codeData.code)
        setReferralCodeId(codeData.id)
        setAffiliateUnlocked(codeData.affiliate_unlocked || false)
        setAffiliateCommissionPct(codeData.affiliate_commission_pct || 5)

        // Get referral tracking entries
        const { data: trackingData } = await supabase
          .from('referral_tracking')
          .select('id, referred_by_name, referred_customer_id, status, conversion_value, commission_paid, converted_at, paid_at, created_at, payout_requested')
          .eq('referral_code_id', codeData.id)
          .order('created_at', { ascending: false })

        setReferrals((trackingData || []) as ReferralEntry[])

        // Check if affiliate should be unlocked (3+ conversions)
        const convertedCount = (trackingData || []).filter(
          (r: any) => r.status === 'converted' || r.status === 'paid'
        ).length
        if (convertedCount >= 3 && !codeData.affiliate_unlocked) {
          await supabase
            .from('referral_codes')
            .update({ affiliate_unlocked: true })
            .eq('id', codeData.id)
          setAffiliateUnlocked(true)
        }
      }
    } catch (err) {
      console.error('Referral load error:', err)
    }
    setLoading(false)
  }

  const generateCode = async () => {
    setGenerating(true)
    try {
      const code = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) +
        Math.random().toString(36).substring(2, 6).toUpperCase()

      const { data, error } = await supabase.from('referral_codes').insert({
        org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
        code,
        type: 'customer',
        owner_id: userId,
        owner_name: userEmail.split('@')[0],
        commission_pct: 0,
        active: true,
      }).select('id, code').single()

      if (data && !error) {
        setReferralCode(data.code)
        setReferralCodeId(data.id)
      }
    } catch (err) {
      console.error('Generate code error:', err)
    }
    setGenerating(false)
  }

  const referralUrl = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ref/${referralCode}`
    : null

  const handleCopy = () => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareEmail = () => {
    if (!referralUrl) return
    const subject = encodeURIComponent('Check out USA Wrap Co!')
    const body = encodeURIComponent(
      `I just got an amazing vehicle wrap from USA Wrap Co and wanted to share. Use my referral link to get started:\n\n${referralUrl}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleShareText = () => {
    if (!referralUrl) return
    const msg = encodeURIComponent(
      `Check out USA Wrap Co! Use my referral link: ${referralUrl}`
    )
    window.location.href = `sms:?body=${msg}`
  }

  const handleRequestPayout = async () => {
    setPayoutRequesting(true)
    try {
      // Mark all unpaid converted referrals as payout requested
      const unpaidIds = referrals
        .filter(r => r.status === 'converted' && !r.payout_requested)
        .map(r => r.id)

      if (unpaidIds.length > 0) {
        await supabase
          .from('referral_tracking')
          .update({ payout_requested: true, payout_requested_at: new Date().toISOString() })
          .in('id', unpaidIds)

        setPayoutSuccess(true)
        setTimeout(() => setPayoutSuccess(false), 4000)
        loadData()
      }
    } catch (err) {
      console.error('Payout request error:', err)
    }
    setPayoutRequesting(false)
  }

  // Stats
  const totalSent = referrals.length
  const totalConverted = referrals.filter(r => r.status === 'converted' || r.status === 'paid').length
  const totalEarned = totalConverted * 100 // $100 per conversion
  const pendingEarnings = referrals.filter(r => r.status === 'converted' && !r.payout_requested).length * 100
  const paidEarnings = referrals.filter(r => r.status === 'paid').reduce((s, r) => s + (r.commission_paid || 100), 0)

  // Affiliate stats
  const affiliateEarnings = affiliateUnlocked
    ? referrals
        .filter(r => r.status === 'converted' || r.status === 'paid')
        .reduce((s, r) => s + (r.conversion_value || 0) * (affiliateCommissionPct / 100), 0)
    : 0

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
            {/* ─── Header ────────────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 16,
              padding: '24px 28px',
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 24, fontWeight: 900, fontFamily: headingFont, marginBottom: 4,
              }}>
                Referral Program
              </div>
              <div style={{ fontSize: 13, color: clr.text2 }}>
                Earn $100 credit for every friend who gets a wrap. Share your unique link below!
              </div>
            </div>

            {/* ─── Referral Link ──────────────────────────────────────────── */}
            {referralCode ? (
              <div style={{
                background: clr.surface,
                border: `1px solid ${clr.border}`,
                borderRadius: 14,
                padding: '20px 24px',
                marginBottom: 24,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                }}>
                  <Link2 size={18} style={{ color: clr.accent }} />
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: headingFont, color: clr.text1 }}>
                    Your Referral Link
                  </span>
                </div>

                {/* Link display */}
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
                }}>
                  <div style={{
                    flex: 1, background: clr.bg, borderRadius: 8, padding: '12px 14px',
                    fontSize: 13, fontFamily: monoFont, color: clr.accent,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    border: `1px solid ${clr.border}`,
                  }}>
                    {referralUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '12px 18px', borderRadius: 8, border: 'none',
                      background: copied ? clr.green : clr.accent,
                      color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800,
                      fontFamily: headingFont, whiteSpace: 'nowrap',
                    }}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Share buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleCopy} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8,
                    border: `1px solid ${clr.border}`, background: 'transparent',
                    color: clr.text2, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  }}>
                    <Copy size={14} /> Copy Link
                  </button>
                  <button onClick={handleShareText} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8,
                    border: `1px solid ${clr.border}`, background: 'transparent',
                    color: clr.text2, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  }}>
                    <MessageSquare size={14} /> Text
                  </button>
                  <button onClick={handleShareEmail} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8,
                    border: `1px solid ${clr.border}`, background: 'transparent',
                    color: clr.text2, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  }}>
                    <Mail size={14} /> Email
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: clr.surface,
                border: `1px solid ${clr.border}`,
                borderRadius: 14,
                padding: '28px 24px',
                marginBottom: 24,
                textAlign: 'center',
              }}>
                <Share2 size={36} style={{ color: clr.text3, marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: clr.text1, marginBottom: 6 }}>
                  Get Your Referral Link
                </div>
                <div style={{ fontSize: 13, color: clr.text2, marginBottom: 18 }}>
                  Generate your unique referral link to start earning $100 per conversion.
                </div>
                <button
                  onClick={generateCode}
                  disabled={generating}
                  style={{
                    padding: '12px 28px', borderRadius: 10, border: 'none',
                    background: clr.accent, color: '#fff', cursor: generating ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 800, fontFamily: headingFont,
                    opacity: generating ? 0.6 : 1,
                  }}
                >
                  {generating ? 'Generating...' : 'Generate Referral Link'}
                </button>
              </div>
            )}

            {/* ─── Dashboard Stats ────────────────────────────────────────── */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
            }}>
              {[
                { label: 'Referrals Sent', value: String(totalSent), icon: Users, color: clr.accent },
                { label: 'Converted', value: String(totalConverted), icon: CheckCircle2, color: clr.green },
                { label: 'Total Earned', value: fmt(totalEarned), icon: DollarSign, color: clr.amber },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: clr.surface, border: `1px solid ${clr.border}`,
                  borderRadius: 12, padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <stat.icon size={16} style={{ color: stat.color }} />
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: clr.text3,
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: monoFont, fontSize: 24, fontWeight: 800, color: stat.color,
                  }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Earnings Breakdown ─────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 900, fontFamily: headingFont,
                color: clr.text1, marginBottom: 14,
              }}>
                Earnings
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{
                  padding: '14px 16px', background: clr.surface2, borderRadius: 10,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Pending
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: monoFont, color: clr.amber }}>
                    {fmt(pendingEarnings)}
                  </div>
                </div>
                <div style={{
                  padding: '14px 16px', background: clr.surface2, borderRadius: 10,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Paid Out
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: monoFont, color: clr.green }}>
                    {fmt(paidEarnings)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: clr.text3, marginTop: 10 }}>
                Earn $100 credit for each referred customer who completes a job.
              </div>
            </div>

            {/* ─── Affiliate Tier ─────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${affiliateUnlocked ? `${clr.purple}40` : clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {affiliateUnlocked && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${clr.purple}, ${clr.cyan})`,
                }} />
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              }}>
                <Zap size={18} style={{ color: affiliateUnlocked ? clr.purple : clr.text3 }} />
                <span style={{
                  fontSize: 16, fontWeight: 900, fontFamily: headingFont,
                  color: affiliateUnlocked ? clr.purple : clr.text1,
                }}>
                  Affiliate Program
                </span>
                {affiliateUnlocked && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                    background: `${clr.purple}20`, color: clr.purple,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Unlocked
                  </span>
                )}
              </div>

              {affiliateUnlocked ? (
                <>
                  <div style={{ fontSize: 13, color: clr.text2, marginBottom: 16 }}>
                    You earn {affiliateCommissionPct}% of the first job value for each referred customer.
                  </div>

                  {/* Affiliate stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ padding: '12px 14px', background: clr.surface2, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Commission Rate
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: monoFont, color: clr.purple }}>
                        {affiliateCommissionPct}%
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px', background: clr.surface2, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: clr.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Affiliate Earnings
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: monoFont, color: clr.green }}>
                        {fmt(affiliateEarnings)}
                      </div>
                    </div>
                  </div>

                  {/* Payout request */}
                  {pendingEarnings > 0 && (
                    <button
                      onClick={handleRequestPayout}
                      disabled={payoutRequesting}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '12px 16px', borderRadius: 10, border: 'none',
                        background: clr.purple, color: '#fff',
                        cursor: payoutRequesting ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 800, fontFamily: headingFont,
                        opacity: payoutRequesting ? 0.6 : 1,
                      }}
                    >
                      <ArrowUpRight size={16} />
                      {payoutRequesting ? 'Requesting...' : 'Request Payout'}
                    </button>
                  )}
                  {payoutSuccess && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                      padding: '10px 14px', background: `${clr.green}10`,
                      border: `1px solid ${clr.green}30`, borderRadius: 8,
                    }}>
                      <CheckCircle2 size={16} style={{ color: clr.green }} />
                      <span style={{ fontSize: 12, color: clr.green, fontWeight: 700 }}>
                        Payout request submitted! Our admin team will review shortly.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: clr.text2, marginBottom: 12 }}>
                    Unlock the affiliate tier by converting 3+ referrals. You will earn 5% of each referred customer&apos;s first job value.
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', background: clr.surface2, borderRadius: 8,
                  }}>
                    <TrendingUp size={14} style={{ color: clr.text3 }} />
                    <span style={{ fontSize: 12, color: clr.text2 }}>
                      {totalConverted}/3 conversions — {totalConverted >= 3 ? 'Unlocking...' : `${3 - totalConverted} more to unlock`}
                    </span>
                    <div style={{
                      flex: 1, height: 4, background: clr.bg, borderRadius: 2, overflow: 'hidden', marginLeft: 8,
                    }}>
                      <div style={{
                        width: `${Math.min(100, (totalConverted / 3) * 100)}%`, height: '100%',
                        background: clr.purple, borderRadius: 2,
                      }} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ─── Referral History ────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              }}>
                <Clock size={18} style={{ color: clr.accent }} />
                <span style={{ fontSize: 16, fontWeight: 900, fontFamily: headingFont, color: clr.text1 }}>
                  Referral History
                </span>
              </div>

              {referrals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Users size={32} style={{ color: clr.text3, marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: clr.text2 }}>
                    No referrals yet. Share your link to get started!
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Date', 'Referred', 'Status', 'Earnings'].map(h => (
                          <th key={h} style={{
                            textAlign: h === 'Earnings' ? 'right' : 'left',
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
                      {referrals.map(r => {
                        const statusColor = r.status === 'paid' ? clr.green
                          : r.status === 'converted' ? clr.amber : clr.text3
                        return (
                          <tr key={r.id}>
                            <td style={{
                              padding: '10px 12px', fontSize: 12, color: clr.text3,
                              borderBottom: `1px solid ${clr.surface2}`, fontFamily: monoFont,
                            }}>
                              {fmtDate(r.created_at)}
                            </td>
                            <td style={{
                              padding: '10px 12px', fontSize: 13, color: clr.text1,
                              borderBottom: `1px solid ${clr.surface2}`, fontWeight: 600,
                            }}>
                              {r.referred_by_name || 'Pending signup'}
                            </td>
                            <td style={{
                              padding: '10px 12px', borderBottom: `1px solid ${clr.surface2}`,
                            }}>
                              <span style={{
                                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                                textTransform: 'uppercase',
                                background: `${statusColor}20`, color: statusColor,
                              }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{
                              padding: '10px 12px', fontSize: 13,
                              borderBottom: `1px solid ${clr.surface2}`, fontFamily: monoFont,
                              fontWeight: 800, textAlign: 'right',
                              color: r.status === 'pending' ? clr.text3 : clr.green,
                            }}>
                              {r.status === 'pending' ? '--' : '$100'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── How It Works ────────────────────────────────────────────── */}
            <div style={{
              background: clr.surface,
              border: `1px solid ${clr.border}`,
              borderRadius: 14,
              padding: '20px 24px',
            }}>
              <div style={{
                fontSize: 16, fontWeight: 900, fontFamily: headingFont,
                color: clr.text1, marginBottom: 16,
              }}>
                How It Works
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends, family, or colleagues.' },
                  { step: '2', title: 'They get a wrap', desc: 'When someone uses your link and completes a job, the referral is tracked.' },
                  { step: '3', title: 'You earn $100', desc: 'Get $100 credit applied to your account for each converted referral.' },
                  { step: '4', title: 'Unlock affiliate', desc: 'After 3+ conversions, earn 5% of each new referred job value.' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${clr.accent}15`, border: `1px solid ${clr.accent}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, fontFamily: monoFont, color: clr.accent,
                      flexShrink: 0,
                    }}>
                      {item.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: clr.text1, marginBottom: 2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: clr.text3 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
