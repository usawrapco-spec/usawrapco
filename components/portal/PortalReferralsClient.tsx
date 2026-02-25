'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Share2, Copy, CheckCircle2, Users } from 'lucide-react'

const headingFont = "'Barlow Condensed', sans-serif"
const monoFont = "'JetBrains Mono', monospace"

interface PortalReferralsClientProps {
  userId: string
  userEmail: string
}

export default function PortalReferralsClient({ userId, userEmail }: PortalReferralsClientProps) {
  const supabase = createClient()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', userEmail)
        .single()

      if (customer) {
        const { data: code } = await supabase
          .from('referral_codes')
          .select('code')
          .eq('customer_id', customer.id)
          .single()

        if (code) setReferralCode(code.code)

        const { data: refs } = await supabase
          .from('referral_tracking')
          .select('id, referred_name, status, created_at, reward_amount')
          .eq('referrer_id', customer.id)
          .order('created_at', { ascending: false })

        setReferrals(refs || [])
      }
      setLoading(false)
    }
    load()
  }, [userEmail])

  const referralUrl = referralCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ref/${referralCode}` : null

  function handleCopy() {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const earned = referrals.filter(r => r.status === 'paid').reduce((s, r) => s + (r.reward_amount || 0), 0)

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: headingFont, fontSize: 22, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24 }}>
        <Share2 size={20} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8, color: 'var(--accent)' }} />
        Referral Program
      </h1>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading...</div>
      ) : (
        <>
          {referralUrl && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Referral Link</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: monoFont, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid var(--border)' }}>
                  {referralUrl}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '10px 14px', borderRadius: 8, border: 'none',
                    background: copied ? 'var(--green)' : 'var(--accent)',
                    color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    fontFamily: headingFont, whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
              <Users size={16} style={{ color: 'var(--accent)', marginBottom: 6 }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: monoFont }}>{referrals.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase' }}>Referrals Sent</div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--green)', marginBottom: 6 }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: monoFont }}>${earned}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase' }}>Earned</div>
            </div>
          </div>

          {referrals.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>History</div>
              {referrals.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{r.referred_name || 'Referral'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 4,
                    background: r.status === 'paid' ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.15)',
                    color: r.status === 'paid' ? 'var(--green)' : 'var(--accent)',
                  }}>
                    {r.status}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!referralCode && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--text2)' }}>No referral code yet. Contact us to get started.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
