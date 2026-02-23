'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Check, X, DollarSign, Clock, Calendar, Wrench,
  ChevronDown, ChevronUp, MessageSquare, Send,
} from 'lucide-react'

interface BidProject {
  id: string
  title: string
  vehicle_desc: string | null
  form_data: Record<string, unknown>
  fin_data: Record<string, unknown> | null
  install_date: string | null
  pipe_stage: string
}

interface InstallerBidCardProps {
  bid: {
    id: string
    org_id: string
    project_id: string
    installer_id: string
    bid_amount: number | null
    estimated_hours: number | null
    available_date: string | null
    budget?: number | null
    hours_budget?: number | null
    pay_amount?: number | null
    status: string
    notes: string | null
    created_at: string
    updated_at: string
    project?: BidProject
  }
  profileId: string
  onAccept?: (bidId: string, amount: number, date: string) => void
  onDecline?: (bidId: string, reason: string) => void
  onCounterOffer?: (bidId: string, amount: number, note: string) => void
  compact?: boolean
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: 'rgba(34,211,238,0.12)',  color: 'var(--cyan)',   label: 'Open' },
  pending:   { bg: 'rgba(245,158,11,0.12)',  color: 'var(--amber)',  label: 'Pending' },
  accepted:  { bg: 'rgba(34,192,122,0.12)',  color: 'var(--green)',  label: 'Accepted' },
  declined:  { bg: 'rgba(242,90,90,0.12)',   color: 'var(--red)',    label: 'Declined' },
  completed: { bg: 'rgba(139,92,246,0.12)',  color: 'var(--purple)', label: 'Completed' },
  expired:   { bg: 'rgba(90,96,128,0.12)',   color: 'var(--text3)',  label: 'Expired' },
  counter:   { bg: 'rgba(79,127,255,0.12)',  color: 'var(--accent)', label: 'Counter Offer' },
}

export default function InstallerBidCard({
  bid,
  profileId,
  onAccept,
  onDecline,
  onCounterOffer,
  compact = false,
}: InstallerBidCardProps) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<'idle' | 'accept' | 'decline' | 'counter'>('idle')
  const [bidAmount, setBidAmount] = useState(bid.bid_amount?.toString() || bid.budget?.toString() || bid.pay_amount?.toString() || '')
  const [availableDate, setAvailableDate] = useState(bid.available_date || '')
  const [declineReason, setDeclineReason] = useState('')
  const [counterAmount, setCounterAmount] = useState('')
  const [counterNote, setCounterNote] = useState('')
  const [loading, setLoading] = useState(false)

  const proj = bid.project
  const fd = (proj?.form_data || {}) as Record<string, string>
  const fin = (proj?.fin_data || {}) as Record<string, number>
  const status = STATUS_STYLES[bid.status] || STATUS_STYLES.pending

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleAccept = async () => {
    if (!bidAmount || !availableDate) return
    setLoading(true)
    if (onAccept) {
      onAccept(bid.id, parseFloat(bidAmount), availableDate)
    } else {
      await supabase.from('installer_bids').update({
        status: 'accepted',
        bid_amount: parseFloat(bidAmount),
        available_date: availableDate,
        updated_at: new Date().toISOString(),
      }).eq('id', bid.id)
    }
    setMode('idle')
    setLoading(false)
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    setLoading(true)
    if (onDecline) {
      onDecline(bid.id, declineReason.trim())
    } else {
      await supabase.from('installer_bids').update({
        status: 'declined',
        notes: declineReason.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', bid.id)
    }
    setMode('idle')
    setLoading(false)
  }

  const handleCounterOffer = async () => {
    if (!counterAmount) return
    setLoading(true)
    if (onCounterOffer) {
      onCounterOffer(bid.id, parseFloat(counterAmount), counterNote)
    } else {
      await supabase.from('installer_bids').update({
        status: 'counter',
        bid_amount: parseFloat(counterAmount),
        notes: counterNote || null,
        updated_at: new Date().toISOString(),
      }).eq('id', bid.id)
    }
    setMode('idle')
    setLoading(false)
  }

  const canAct = bid.status === 'open' || bid.status === 'pending'

  return (
    <div style={{
      background: bid.status === 'accepted' ? 'rgba(34,192,122,0.04)' : 'var(--surface)',
      border: `1px solid ${bid.status === 'accepted' ? 'rgba(34,192,122,0.25)' : 'var(--border)'}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: compact ? '10px 14px' : '14px 18px',
          cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: compact ? 15 : 17, fontWeight: 800, color: 'var(--text1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {fd.client || proj?.title || 'Untitled Job'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {fd.vehicle || proj?.vehicle_desc || 'No vehicle info'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {(bid.bid_amount || bid.budget || bid.pay_amount) && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 14, fontWeight: 700, color: 'var(--green)',
            }}>
              ${bid.bid_amount || bid.budget || bid.pay_amount}
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
            background: status.bg, color: status.color,
          }}>
            {status.label}
          </span>
          {expanded
            ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          }
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <DollarSign size={11} color="var(--green)" />
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' as const }}>Pay</span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                ${bid.bid_amount || bid.budget || bid.pay_amount || 0}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Clock size={11} color="var(--cyan)" />
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' as const }}>Hours</span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>
                {bid.estimated_hours || bid.hours_budget || 0}h
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Calendar size={11} color="var(--accent)" />
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' as const }}>Install</span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                {formatDate(proj?.install_date || null)}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Wrench size={11} color="var(--purple)" />
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' as const }}>Type</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>
                {fd.wrapDetail || fd.wrap_type || 'Wrap'}
              </div>
            </div>
          </div>

          {/* $/hr calculation */}
          {(bid.bid_amount || bid.pay_amount) && (bid.estimated_hours || bid.hours_budget) && (
            <div style={{
              padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)',
            }}>
              <DollarSign size={12} color="var(--text3)" />
              Effective rate:
              <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                ${Math.round(
                  (Number(bid.bid_amount || bid.pay_amount || 0)) /
                  (Number(bid.estimated_hours || bid.hours_budget || 1))
                )}/hr
              </strong>
            </div>
          )}

          {/* Notes */}
          {bid.notes && (
            <div style={{
              padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 14,
              fontSize: 12, color: 'var(--text2)',
            }}>
              <MessageSquare size={11} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--text3)' }} />
              {bid.notes}
            </div>
          )}

          {/* Timestamp */}
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: canAct ? 14 : 0 }}>
            Sent {formatDate(bid.created_at)}
            {bid.updated_at !== bid.created_at && (
              <span> -- Updated {formatDate(bid.updated_at)}</span>
            )}
          </div>

          {/* Action Buttons */}
          {canAct && mode === 'idle' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); setMode('accept') }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--green)', color: '#0d1a10', fontSize: 13, fontWeight: 800,
                }}
              >
                <Check size={14} /> Accept
              </button>
              <button
                onClick={e => { e.stopPropagation(); setMode('counter') }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: 8, border: '1px solid var(--accent)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 700,
                }}
              >
                <Send size={13} /> Counter
              </button>
              <button
                onClick={e => { e.stopPropagation(); setMode('decline') }}
                style={{
                  padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text3)', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <X size={14} /> Pass
              </button>
            </div>
          )}

          {/* Accept Form */}
          {canAct && mode === 'accept' && (
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
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 800,
                    color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 4,
                  }}>
                    Your Bid ($)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 800,
                    color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 4,
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
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAccept}
                  disabled={loading || !bidAmount || !availableDate}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                    background: 'var(--green)', color: '#0d1a10', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', opacity: (!bidAmount || !availableDate) ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Submitting...' : 'Confirm Accept'}
                </button>
                <button
                  onClick={() => setMode('idle')}
                  style={{
                    padding: '10px 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Counter Offer Form */}
          {canAct && mode === 'counter' && (
            <div style={{
              padding: 16, background: 'rgba(79,127,255,0.05)', borderRadius: 10,
              border: '1px solid rgba(79,127,255,0.2)',
            }}>
              <div style={{
                fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Submit Counter Offer
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 800,
                    color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 4,
                  }}>
                    Your Counter ($)
                  </label>
                  <input
                    type="number"
                    value={counterAmount}
                    onChange={e => setCounterAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 14, fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 800,
                    color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 4,
                  }}>
                    Original Offer
                  </label>
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'var(--text3)',
                  }}>
                    ${bid.bid_amount || bid.budget || bid.pay_amount || 0}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 800,
                  color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 4,
                }}>
                  Note (Optional)
                </label>
                <textarea
                  value={counterNote}
                  onChange={e => setCounterNote(e.target.value)}
                  placeholder="Explain your counter offer..."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text1)', fontSize: 13, resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCounterOffer}
                  disabled={loading || !counterAmount}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', opacity: !counterAmount ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Sending...' : 'Send Counter Offer'}
                </button>
                <button
                  onClick={() => setMode('idle')}
                  style={{
                    padding: '10px 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Decline Form */}
          {canAct && mode === 'decline' && (
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
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 800,
                  color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 4,
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
                  onClick={handleDecline}
                  disabled={loading || !declineReason.trim()}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                    background: 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', opacity: !declineReason.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Submitting...' : 'Confirm Decline'}
                </button>
                <button
                  onClick={() => setMode('idle')}
                  style={{
                    padding: '10px 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
