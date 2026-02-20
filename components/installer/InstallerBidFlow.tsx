'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clsx } from 'clsx'
import {
  Send,
  X,
  Check,
  Clock,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  Wrench,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Timer,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InstallerBidFlowProps {
  projectId: string
  orgId: string
  currentUserId: string
  project: any // Project object with form_data, fin_data, vehicle_desc, pipe_stage
  installers: { id: string; name: string; email: string }[]
}

interface BidRecord {
  id: string
  org_id: string
  project_id: string
  installer_id: string
  bid_amount: number | null
  estimated_hours: number | null
  available_date: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  notes: string | null
  created_at: string
  updated_at: string
  installer?: { id: string; name: string; email?: string }
}

/* ------------------------------------------------------------------ */
/*  Status badge config                                                */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)',  label: 'Pending' },
  accepted: { bg: 'rgba(34,192,122,0.12)', color: 'var(--green)',  label: 'Accepted' },
  declined: { bg: 'rgba(242,90,90,0.12)',  color: 'var(--red)',    label: 'Declined' },
  expired:  { bg: 'rgba(90,96,128,0.12)',  color: 'var(--text3)',  label: 'Expired' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InstallerBidFlow({
  projectId,
  orgId,
  currentUserId,
  project,
  installers,
}: InstallerBidFlowProps) {
  const supabase = createClient()

  const [bids, setBids] = useState<BidRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInstallers, setSelectedInstallers] = useState<Set<string>>(new Set())
  const [bidDeadline, setBidDeadline] = useState('')
  const [estimatedHoursMin, setEstimatedHoursMin] = useState('')
  const [estimatedHoursMax, setEstimatedHoursMax] = useState('')
  const [bidNotes, setBidNotes] = useState('')
  const [sending, setSending] = useState(false)

  // Expanded detail cards
  const [expandedBid, setExpandedBid] = useState<string | null>(null)

  const fd = (project.form_data as any) || {}
  const fin = (project.fin_data as any) || {}
  const isInstallStage = project.pipe_stage === 'install'
  const acceptedBid = bids.find(b => b.status === 'accepted')

  /* ---------------------------------------------------------------- */
  /*  Load bids                                                        */
  /* ---------------------------------------------------------------- */

  const loadBids = useCallback(async () => {
    const { data } = await supabase
      .from('installer_bids')
      .select('*, installer:installer_id(id, name, email)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (data) setBids(data as BidRecord[])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadBids()
  }, [loadBids])

  /* ---------------------------------------------------------------- */
  /*  Realtime subscription                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const channel = supabase
      .channel(`installer-bids-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'installer_bids',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadBids()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, loadBids])

  /* ---------------------------------------------------------------- */
  /*  Toggle installer selection                                       */
  /* ---------------------------------------------------------------- */

  const toggleInstaller = (id: string) => {
    setSelectedInstallers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  /* ---------------------------------------------------------------- */
  /*  Send bids                                                        */
  /* ---------------------------------------------------------------- */

  const sendBids = async () => {
    if (selectedInstallers.size === 0) return
    setSending(true)

    const hoursEst =
      estimatedHoursMin && estimatedHoursMax
        ? (parseFloat(estimatedHoursMin) + parseFloat(estimatedHoursMax)) / 2
        : estimatedHoursMin
          ? parseFloat(estimatedHoursMin)
          : estimatedHoursMax
            ? parseFloat(estimatedHoursMax)
            : null

    const inserts = Array.from(selectedInstallers).map(installerId => ({
      org_id: orgId,
      project_id: projectId,
      installer_id: installerId,
      estimated_hours: hoursEst,
      status: 'pending',
      notes: bidNotes || null,
      updated_at: new Date().toISOString(),
    }))

    const { data } = await supabase
      .from('installer_bids')
      .insert(inserts)
      .select('*, installer:installer_id(id, name, email)')

    if (data) {
      setBids(prev => [...(data as BidRecord[]), ...prev])
    }

    // Reset modal
    setSending(false)
    setSelectedInstallers(new Set())
    setBidDeadline('')
    setEstimatedHoursMin('')
    setEstimatedHoursMax('')
    setBidNotes('')
    setModalOpen(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Accept a bid                                                     */
  /* ---------------------------------------------------------------- */

  const acceptBid = async (bidId: string, installerId: string) => {
    // Accept selected bid
    await supabase
      .from('installer_bids')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', bidId)

    // Decline all other pending bids for this project
    const otherPending = bids.filter(b => b.id !== bidId && b.status === 'pending')
    for (const b of otherPending) {
      await supabase
        .from('installer_bids')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', b.id)
    }

    // Assign installer to project
    await supabase
      .from('projects')
      .update({ installer_id: installerId, updated_at: new Date().toISOString() })
      .eq('id', projectId)

    loadBids()
  }

  /* ---------------------------------------------------------------- */
  /*  Job summary helper                                               */
  /* ---------------------------------------------------------------- */

  const jobSummary = {
    client: fd.client || project.title || 'N/A',
    vehicle: fd.vehicle || project.vehicle_desc || 'N/A',
    wrapType: fd.wrapDetail || fd.jobType || 'Wrap',
    pay: fin.labor || fin.install_pay || 0,
    hours: fin.hours || 0,
  }

  /* ---------------------------------------------------------------- */
  /*  Derived counts                                                   */
  /* ---------------------------------------------------------------- */

  const pendingBids = bids.filter(b => b.status === 'pending')
  const declinedBids = bids.filter(b => b.status === 'declined')
  const expiredBids = bids.filter(b => b.status === 'expired')
  const alreadySentIds = new Set(bids.map(b => b.installer_id))

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        Loading installer bids...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* -------- Header + Send Button -------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wrench size={16} style={{ color: 'var(--cyan)' }} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: 'var(--text1)',
              letterSpacing: '.02em',
            }}
          >
            Installer Bids
          </span>
          {bids.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'var(--surface2)',
                color: 'var(--text3)',
              }}
            >
              {bids.length} sent
            </span>
          )}
        </div>

        {isInstallStage && !acceptedBid && (
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 12,
              background: 'var(--cyan)',
              color: '#0a2540',
            }}
          >
            <Send size={13} />
            Send to Installers
          </button>
        )}
      </div>

      {/* -------- Accepted Bid Highlight -------- */}
      {acceptedBid && (
        <div
          style={{
            padding: 16,
            background: 'rgba(34,192,122,0.06)',
            border: '1px solid rgba(34,192,122,0.25)',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <UserCheck size={15} style={{ color: 'var(--green)' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: 'var(--green)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Installer Assigned
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)' }}>
            {(acceptedBid.installer as any)?.name || 'Unknown'}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 10,
              fontSize: 12,
              color: 'var(--text2)',
            }}
          >
            {acceptedBid.bid_amount != null && (
              <span>
                Bid:{' '}
                <strong style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${Number(acceptedBid.bid_amount).toLocaleString()}
                </strong>
              </span>
            )}
            {acceptedBid.estimated_hours != null && (
              <span>
                Hours:{' '}
                <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {acceptedBid.estimated_hours}h
                </strong>
              </span>
            )}
            {acceptedBid.available_date && (
              <span>
                Available:{' '}
                <strong>
                  {new Date(acceptedBid.available_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* -------- Job Summary (when no accepted bid) -------- */}
      {!acceptedBid && bids.length === 0 && isInstallStage && (
        <div
          style={{
            padding: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: 10,
            }}
          >
            Job Summary
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap' }}>
            <span>
              Client: <strong style={{ color: 'var(--text1)' }}>{jobSummary.client}</strong>
            </span>
            <span>
              Vehicle: <strong style={{ color: 'var(--text1)' }}>{jobSummary.vehicle}</strong>
            </span>
            <span>
              Type: <strong style={{ color: 'var(--text1)' }}>{jobSummary.wrapType}</strong>
            </span>
            <span>
              Pay:{' '}
              <strong style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                ${jobSummary.pay}
              </strong>
            </span>
            <span>
              Est Hours:{' '}
              <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{jobSummary.hours}h</strong>
            </span>
          </div>
        </div>
      )}

      {/* -------- Bid Status Cards -------- */}
      {bids.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Pending section */}
          {pendingBids.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  marginBottom: 8,
                }}
              >
                <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Awaiting Response ({pendingBids.length})
              </div>
              {pendingBids.map(bid => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  expanded={expandedBid === bid.id}
                  onToggle={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                  onAccept={!acceptedBid ? () => acceptBid(bid.id, bid.installer_id) : undefined}
                />
              ))}
            </div>
          )}

          {/* Responded (declined / expired) */}
          {(declinedBids.length > 0 || expiredBids.length > 0) && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  marginBottom: 8,
                  marginTop: 8,
                }}
              >
                Closed ({declinedBids.length + expiredBids.length})
              </div>
              {[...declinedBids, ...expiredBids].map(bid => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  expanded={expandedBid === bid.id}
                  onToggle={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------- Empty state -------- */}
      {bids.length === 0 && !isInstallStage && (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 13,
          }}
        >
          <AlertCircle size={20} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div>Job must be in the Install stage to send bids to installers.</div>
        </div>
      )}

      {/* -------- Modal -------- */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Send size={16} style={{ color: 'var(--cyan)' }} />
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text1)' }}>
                  Send to Installers
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Job details summary */}
            <div
              style={{
                padding: 14,
                background: 'var(--surface2)',
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  marginBottom: 8,
                }}
              >
                Job Details
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--text2)',
                }}
              >
                <div>
                  Client:{' '}
                  <strong style={{ color: 'var(--text1)' }}>{jobSummary.client}</strong>
                </div>
                <div>
                  Vehicle:{' '}
                  <strong style={{ color: 'var(--text1)' }}>{jobSummary.vehicle}</strong>
                </div>
                <div>
                  Wrap Type:{' '}
                  <strong style={{ color: 'var(--text1)' }}>{jobSummary.wrapType}</strong>
                </div>
                <div>
                  Budget Pay:{' '}
                  <strong
                    style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    ${jobSummary.pay}
                  </strong>
                </div>
              </div>
            </div>

            {/* Select installers */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Users size={12} />
                Select Installers
              </div>

              {installers.length === 0 && (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text3)',
                    background: 'var(--surface2)',
                    borderRadius: 10,
                  }}
                >
                  No installers found. Add team members with the installer role in the Employees
                  page.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {installers.map(inst => {
                  const alreadySent = alreadySentIds.has(inst.id)
                  const isSelected = selectedInstallers.has(inst.id)

                  return (
                    <label
                      key={inst.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: isSelected
                          ? 'rgba(34,211,238,0.06)'
                          : 'var(--surface2)',
                        border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border)'}`,
                        borderRadius: 10,
                        cursor: alreadySent ? 'default' : 'pointer',
                        opacity: alreadySent ? 0.45 : 1,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={alreadySent}
                        checked={isSelected}
                        onChange={() => toggleInstaller(inst.id)}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: '#22d3ee',
                          cursor: alreadySent ? 'default' : 'pointer',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                          {inst.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{inst.email}</div>
                      </div>
                      {alreadySent && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 5,
                            background: 'rgba(245,158,11,0.12)',
                            color: 'var(--amber)',
                          }}
                        >
                          Already Sent
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Fields row: deadline + estimated hours */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* Bid deadline */}
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: 'var(--text3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  <Calendar size={10} />
                  Bid Deadline
                </label>
                <input
                  type="date"
                  value={bidDeadline}
                  onChange={e => setBidDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '9px 10px',
                    fontSize: 12,
                    color: 'var(--text1)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Estimated hours min */}
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: 'var(--text3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  <Timer size={10} />
                  Hours Min
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 4"
                  value={estimatedHoursMin}
                  onChange={e => setEstimatedHoursMin(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '9px 10px',
                    fontSize: 12,
                    color: 'var(--text1)',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Estimated hours max */}
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: 'var(--text3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  <Timer size={10} />
                  Hours Max
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={estimatedHoursMax}
                  onChange={e => setEstimatedHoursMax(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '9px 10px',
                    fontSize: 12,
                    color: 'var(--text1)',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Notes for Installers
              </label>
              <textarea
                rows={3}
                placeholder="Any special instructions, vehicle condition notes, access details..."
                value={bidNotes}
                onChange={e => setBidNotes(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text1)',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Modal actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text3)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendBids}
                disabled={selectedInstallers.size === 0 || sending}
                style={{
                  flex: 2,
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: selectedInstallers.size > 0 ? 'pointer' : 'not-allowed',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background:
                    selectedInstallers.size > 0 ? 'var(--cyan)' : 'var(--surface2)',
                  color:
                    selectedInstallers.size > 0 ? '#0a2540' : 'var(--text3)',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                <Send size={14} />
                {sending
                  ? 'Sending...'
                  : `Send Bid to ${selectedInstallers.size} Installer${selectedInstallers.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bid Card sub-component                                             */
/* ------------------------------------------------------------------ */

function BidCard({
  bid,
  expanded,
  onToggle,
  onAccept,
}: {
  bid: BidRecord
  expanded: boolean
  onToggle: () => void
  onAccept?: () => void
}) {
  const cfg = STATUS_CONFIG[bid.status] || STATUS_CONFIG.pending
  const installerName = (bid.installer as any)?.name || 'Unknown Installer'
  const installerEmail = (bid.installer as any)?.email || ''

  return (
    <div
      style={{
        background: bid.status === 'accepted' ? 'rgba(34,192,122,0.04)' : 'var(--surface)',
        border: `1px solid ${bid.status === 'accepted' ? 'rgba(34,192,122,0.25)' : 'var(--border)'}`,
        borderRadius: 10,
        marginBottom: 6,
        overflow: 'hidden',
      }}
    >
      {/* Card header row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text2)',
            }}
          >
            {installerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
              {installerName}
            </div>
            {installerEmail && (
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{installerEmail}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Bid amount if responded */}
          {bid.bid_amount != null && (
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--green)',
              }}
            >
              ${Number(bid.bid_amount).toLocaleString()}
            </span>
          )}

          {/* Status badge */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 6,
              background: cfg.bg,
              color: cfg.color,
            }}
          >
            {cfg.label}
          </span>

          {/* Expand chevron */}
          {expanded ? (
            <ChevronUp size={14} style={{ color: 'var(--text3)' }} />
          ) : (
            <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            padding: '0 14px 14px',
            borderTop: '1px solid var(--border)',
            paddingTop: 12,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <MiniStat
              label="Bid Amount"
              value={bid.bid_amount != null ? `$${Number(bid.bid_amount).toLocaleString()}` : '--'}
              color="var(--green)"
            />
            <MiniStat
              label="Est. Hours"
              value={bid.estimated_hours != null ? `${bid.estimated_hours}h` : '--'}
              color="var(--cyan)"
            />
            <MiniStat
              label="Available"
              value={
                bid.available_date
                  ? new Date(bid.available_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '--'
              }
              color="var(--accent)"
            />
          </div>

          {bid.notes && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                padding: '8px 10px',
                background: 'var(--surface2)',
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {bid.notes}
            </div>
          )}

          <div
            style={{
              fontSize: 10,
              color: 'var(--text3)',
              marginBottom: onAccept ? 10 : 0,
            }}
          >
            Sent {new Date(bid.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {bid.updated_at !== bid.created_at && (
              <>
                {' '}
                &middot; Updated{' '}
                {new Date(bid.updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </>
            )}
          </div>

          {/* Accept button for pending bids */}
          {onAccept && bid.status === 'pending' && bid.bid_amount != null && (
            <button
              onClick={e => {
                e.stopPropagation()
                onAccept()
              }}
              style={{
                width: '100%',
                padding: '10px 20px',
                borderRadius: 9,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                border: 'none',
                background: 'var(--green)',
                color: '#0d1a10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Check size={14} />
              Accept This Bid
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mini stat helper                                                   */
/* ------------------------------------------------------------------ */

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 900,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          fontWeight: 700,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  )
}
