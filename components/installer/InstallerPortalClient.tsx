'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wrench, Check, X, Clock, DollarSign, Calendar, Bell } from 'lucide-react'
import clsx from 'clsx'
import type { Profile } from '@/types'

interface InstallerPortalClientProps {
  profile: Profile
  bids: any[]
  openBids?: any[]
}

type Tab = 'open' | 'pending' | 'accepted' | 'history'

export default function InstallerPortalClient({ profile, bids: initialBids, openBids: initialOpenBids = [] }: InstallerPortalClientProps) {
  const supabase = createClient()
  const [bids, setBids] = useState<any[]>(initialBids)
  const [openBids, setOpenBids] = useState<any[]>(initialOpenBids)
  const [newBidAlert, setNewBidAlert] = useState(false)

  // Realtime subscription for bid updates
  useEffect(() => {
    const channel = supabase
      .channel('installer-bids-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'installer_bids',
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Record<string, unknown>
          // Update my bids if this bid belongs to me
          if (updated.installer_id === profile.id) {
            setBids(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
          }
          // Remove from open bids if status changed from open
          if (updated.status !== 'open') {
            setOpenBids(prev => prev.filter(b => b.id !== updated.id))
          }
        } else if (payload.eventType === 'INSERT') {
          const newBid = payload.new as Record<string, unknown>
          if (newBid.status === 'open') {
            // New open bid available - show alert
            setNewBidAlert(true)
            setTimeout(() => setNewBidAlert(false), 5000)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.id])
  const [activeTab, setActiveTab] = useState<Tab>(initialOpenBids.length > 0 ? 'open' : 'pending')
  const [submittingBidId, setSubmittingBidId] = useState<string | null>(null)
  const [myBidAmount, setMyBidAmount] = useState('')
  const [myBidDate, setMyBidDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Inline form state for accepting
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [availableDate, setAvailableDate] = useState('')
  const [acceptLoading, setAcceptLoading] = useState(false)

  // Inline form state for declining
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [declineLoading, setDeclineLoading] = useState(false)

  // Categorize bids
  const pendingBids  = bids.filter(b => b.status === 'pending')
  const acceptedBids = bids.filter(b => b.status === 'accepted')
  const historyBids  = bids.filter(b => b.status === 'declined' || b.status === 'completed')

  async function submitBid(bidId: string) {
    if (!myBidAmount || !myBidDate) return
    setSubmitting(true)
    const { error } = await supabase.from('installer_bids').update({
      installer_id: profile.id,
      bid_amount: parseFloat(myBidAmount),
      available_date: myBidDate,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', bidId)
    if (!error) {
      setSubmittingBidId(null)
      setMyBidAmount('')
      setMyBidDate('')
      // Award installer_bid XP
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'installer_bid', sourceType: 'installer_bid', sourceId: bidId }),
      }).catch(() => {})
    }
    setSubmitting(false)
  }

  // Accept a bid
  const handleAccept = async (bidId: string) => {
    if (!bidAmount || !availableDate) return
    setAcceptLoading(true)

    const { error } = await supabase
      .from('installer_bids')
      .update({
        status: 'accepted',
        bid_amount: parseFloat(bidAmount),
        available_date: availableDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidId)

    if (!error) {
      setBids(prev =>
        prev.map(b =>
          b.id === bidId
            ? { ...b, status: 'accepted', bid_amount: parseFloat(bidAmount), available_date: availableDate }
            : b
        )
      )
      setAcceptingId(null)
      setBidAmount('')
      setAvailableDate('')
    }
    setAcceptLoading(false)
  }

  // Decline a bid
  const handleDecline = async (bidId: string) => {
    if (!declineReason.trim()) return
    setDeclineLoading(true)

    const { error } = await supabase
      .from('installer_bids')
      .update({
        status: 'declined',
        notes: declineReason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidId)

    if (!error) {
      setBids(prev =>
        prev.map(b =>
          b.id === bidId
            ? { ...b, status: 'declined', notes: declineReason.trim() }
            : b
        )
      )
      setDecliningId(null)
      setDeclineReason('')
    }
    setDeclineLoading(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'open',     label: 'Open Bids',    count: openBids.length },
    { key: 'pending',  label: 'Pending',       count: pendingBids.length },
    { key: 'accepted', label: 'Accepted',      count: acceptedBids.length },
    { key: 'history',  label: 'History',       count: historyBids.length },
  ]

  return (
    <div>
      {/* New bid alert banner */}
      {newBidAlert && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 16,
          background: 'rgba(34,192,122,0.12)', border: '1px solid rgba(34,192,122,0.3)',
          borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#22c07a',
        }}>
          <Bell size={15} />
          New bid opportunity available! Switch to &quot;Open Bids&quot; tab.
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(79,127,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wrench size={20} color="var(--accent)" />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24, fontWeight: 800, color: 'var(--text1)', margin: 0,
          }}>
            Installer Portal
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{profile.name}</div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Pending
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--amber)', marginTop: 4 }}>
            {pendingBids.length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Accepted
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
            {acceptedBids.length}
          </div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Completed
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--cyan)', marginTop: 4 }}>
            {historyBids.filter(b => b.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4,
        background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(activeTab === t.key && 'active')}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === t.key ? 800 : 600,
              background: activeTab === t.key ? 'rgba(79,127,255,0.1)' : 'transparent',
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text3)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* ─── Open Bids ───────────────────────────────────────────────── */}
      {activeTab === 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {openBids.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Wrench size={28} color="var(--text3)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>No open bids available right now.</div>
            </div>
          )}
          {openBids.map(bid => {
            const proj = bid.project as any
            const fd   = (proj?.form_data as any) || {}
            const isBidding = submittingBidId === bid.id
            return (
              <div key={bid.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--text1)' }}>
                      {fd.client || proj?.title || 'Open Job'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{fd.vehicle || proj?.vehicle_desc || '—'}</div>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: 10, fontWeight: 800 }}>Open</span>
                </div>
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Budget</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                      ${bid.budget || bid.bid_amount || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Est. Hours</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: 'var(--cyan)' }}>
                      {bid.estimated_hours || bid.hours_budget || '—'}h
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Install Date</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                      {formatDate(proj?.install_date)}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                  {!isBidding ? (
                    <button onClick={() => { setSubmittingBidId(bid.id); setMyBidAmount(bid.budget?.toString() || '') }}
                      style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                      Submit My Bid
                    </button>
                  ) : (
                    <div style={{ padding: 16, background: 'rgba(79,127,255,0.06)', borderRadius: 10, border: '1px solid rgba(79,127,255,0.2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>Submit Your Bid</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Your Bid Amount ($)</label>
                          <input type="number" value={myBidAmount} onChange={e => setMyBidAmount(e.target.value)} placeholder="0.00"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Available Date</label>
                          <input type="date" value={myBidDate} onChange={e => setMyBidDate(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 14 }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => submitBid(bid.id)} disabled={submitting || !myBidAmount || !myBidDate}
                          style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                          {submitting ? 'Submitting...' : 'Send Bid'}
                        </button>
                        <button onClick={() => { setSubmittingBidId(null); setMyBidAmount(''); setMyBidDate('') }}
                          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Pending Bids ─────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pendingBids.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Clock size={28} color="var(--text3)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>No pending bids right now.</div>
            </div>
          )}
          {pendingBids.map(bid => {
            const proj = bid.project as any
            const fd = (proj?.form_data as any) || {}
            const isAccepting = acceptingId === bid.id
            const isDeclining = decliningId === bid.id

            return (
              <div key={bid.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontSize: 17, fontWeight: 800, color: 'var(--text1)',
                      }}>
                        {fd.client || proj?.title || 'Untitled Job'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        {fd.vehicle || proj?.vehicle_desc || 'No vehicle info'}
                      </div>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: 10, fontWeight: 800 }}>
                      Pending
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <DollarSign size={12} color="var(--green)" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Estimated Pay</span>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                      ${bid.bid_amount || bid.pay_amount || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Clock size={12} color="var(--cyan)" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Est. Hours</span>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: 'var(--cyan)' }}>
                      {bid.estimated_hours || bid.hours_budget || 0}h
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Calendar size={12} color="var(--accent)" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Install Date</span>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                      {formatDate(proj?.install_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Wrench size={12} color="var(--purple)" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Type</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>
                      {fd.wrapDetail || fd.wrap_type || 'Wrap'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                  {!isAccepting && !isDeclining && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setAcceptingId(bid.id)
                          setDecliningId(null)
                          setBidAmount(bid.bid_amount?.toString() || bid.pay_amount?.toString() || '')
                        }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 20px', borderRadius: 8, fontWeight: 800, fontSize: 13,
                          cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#0d1a10',
                        }}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setDecliningId(bid.id)
                          setAcceptingId(null)
                        }}
                        style={{
                          padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  )}

                  {/* Accept inline form */}
                  {isAccepting && (
                    <div style={{
                      padding: 16, background: 'rgba(34,192,122,0.05)', borderRadius: 10,
                      border: '1px solid rgba(34,192,122,0.2)',
                    }}>
                      <div style={{
                        fontSize: 12, fontWeight: 800, color: 'var(--green)', marginBottom: 12,
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                        Confirm Acceptance
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label className="field" style={{
                            display: 'block', fontSize: 10, fontWeight: 800,
                            color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4,
                          }}>
                            Your Bid Amount ($)
                          </label>
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={e => setBidAmount(e.target.value)}
                            placeholder="0.00"
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: 8,
                              background: 'var(--surface2)', border: '1px solid var(--border)',
                              color: 'var(--text1)', fontSize: 14,
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          />
                        </div>
                        <div>
                          <label className="field" style={{
                            display: 'block', fontSize: 10, fontWeight: 800,
                            color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4,
                          }}>
                            Available Date
                          </label>
                          <input
                            type="date"
                            value={availableDate}
                            onChange={e => setAvailableDate(e.target.value)}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: 8,
                              background: 'var(--surface2)', border: '1px solid var(--border)',
                              color: 'var(--text1)', fontSize: 14,
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleAccept(bid.id)}
                          disabled={acceptLoading || !bidAmount || !availableDate}
                          style={{
                            flex: 1, padding: '10px 20px', borderRadius: 8, fontWeight: 800, fontSize: 13,
                            cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#0d1a10',
                            opacity: (!bidAmount || !availableDate) ? 0.5 : 1,
                          }}
                        >
                          {acceptLoading ? 'Submitting...' : 'Confirm Accept'}
                        </button>
                        <button
                          onClick={() => { setAcceptingId(null); setBidAmount(''); setAvailableDate('') }}
                          style={{
                            padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                            cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text3)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Decline inline form */}
                  {isDeclining && (
                    <div style={{
                      padding: 16, background: 'rgba(242,90,90,0.05)', borderRadius: 10,
                      border: '1px solid rgba(242,90,90,0.2)',
                    }}>
                      <div style={{
                        fontSize: 12, fontWeight: 800, color: 'var(--red)', marginBottom: 12,
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                        Decline Bid
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label className="field" style={{
                          display: 'block', fontSize: 10, fontWeight: 800,
                          color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4,
                        }}>
                          Reason
                        </label>
                        <textarea
                          value={declineReason}
                          onChange={e => setDeclineReason(e.target.value)}
                          placeholder="Why are you declining this bid?"
                          rows={3}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            color: 'var(--text1)', fontSize: 13, resize: 'vertical',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleDecline(bid.id)}
                          disabled={declineLoading || !declineReason.trim()}
                          style={{
                            flex: 1, padding: '10px 20px', borderRadius: 8, fontWeight: 800, fontSize: 13,
                            cursor: 'pointer', border: 'none', background: 'var(--red)', color: '#fff',
                            opacity: !declineReason.trim() ? 0.5 : 1,
                          }}
                        >
                          {declineLoading ? 'Submitting...' : 'Confirm Decline'}
                        </button>
                        <button
                          onClick={() => { setDecliningId(null); setDeclineReason('') }}
                          style={{
                            padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                            cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text3)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Accepted Bids ────────────────────────────────────────────── */}
      {activeTab === 'accepted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {acceptedBids.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Check size={28} color="var(--text3)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>No accepted bids yet.</div>
            </div>
          )}
          {acceptedBids.map(bid => {
            const proj = bid.project as any
            const fd = (proj?.form_data as any) || {}

            return (
              <div key={bid.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: 16, fontWeight: 800, color: 'var(--text1)',
                    }}>
                      {fd.client || proj?.title || 'Untitled Job'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {fd.vehicle || proj?.vehicle_desc || 'No vehicle info'}
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 800 }}>
                    Accepted
                  </span>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14,
                  padding: '12px 0', borderTop: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Bid Amount</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)', marginTop: 2 }}>
                      ${bid.bid_amount || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Est. Hours</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--cyan)', marginTop: 2 }}>
                      {bid.estimated_hours || bid.hours_budget || 0}h
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Available Date</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                      {formatDate(bid.available_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Install Date</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginTop: 2 }}>
                      {formatDate(proj?.install_date)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── History ──────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {historyBids.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Clock size={28} color="var(--text3)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>No bid history yet.</div>
            </div>
          )}
          <div className="data-table" style={{ width: '100%' }}>
            {historyBids.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Job</th>
                    <th style={thStyle}>Vehicle</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Hours</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyBids.map(bid => {
                    const proj = bid.project as any
                    const fd = (proj?.form_data as any) || {}
                    const isCompleted = bid.status === 'completed'

                    return (
                      <tr key={bid.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: 'var(--text1)' }}>
                            {fd.client || proj?.title || 'Untitled'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: 'var(--text2)', fontSize: 12 }}>
                            {fd.vehicle || proj?.vehicle_desc || '--'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--green)' }}>
                            ${bid.bid_amount || 0}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>
                            {bid.estimated_hours || bid.hours_budget || 0}h
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className={clsx('badge', isCompleted ? 'badge-green' : 'badge-red')} style={{ fontSize: 10 }}>
                            {bid.status === 'completed' ? 'Completed' : 'Declined'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text3)' }}>
                            {formatDate(bid.updated_at || bid.created_at)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Table styles
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  borderBottom: '1px solid var(--border)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 13,
}
