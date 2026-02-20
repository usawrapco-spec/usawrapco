'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CustomerProofingProps {
  token: string
}

export default function CustomerProofing({ token }: CustomerProofingProps) {
  const [settings, setSettings] = useState<any>(null)
  const [proofs, setProofs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase
        .from('proof_settings')
        .select('*')
        .eq('proofing_token', token)
        .single()

      if (s) {
        setSettings(s)
        const { data: p } = await supabase
          .from('design_proofs')
          .select('*')
          .eq('project_id', s.project_id)
          .order('version_number', { ascending: false })

        if (p) setProofs(p)
      }
      setLoading(false)
    }
    load()
  }, [token])

  const latestProof = proofs[0]
  const revisionsLeft = settings ? settings.max_revisions - settings.revisions_used : 0

  const approveDesign = async () => {
    if (!latestProof || !confirmName || !responsibilityAccepted) return
    setSaving(true)

    await supabase.from('design_proofs').update({
      customer_status: 'approved',
      customer_approved_at: new Date().toISOString(),
      customer_name_confirm: confirmName,
      responsibility_accepted: true,
      customer_feedback: feedback || 'Approved — no changes needed',
    }).eq('id', latestProof.id)

    // Update proof in state
    setProofs(prev => prev.map(p => p.id === latestProof.id
      ? { ...p, customer_status: 'approved', customer_name_confirm: confirmName }
      : p
    ))
    setSaving(false)
  }

  const requestRevision = async () => {
    if (!latestProof || !feedback.trim()) return
    if (revisionsLeft <= 0) return
    setSaving(true)

    await supabase.from('design_proofs').update({
      customer_status: 'revision_requested',
      customer_feedback: feedback,
    }).eq('id', latestProof.id)

    await supabase.from('proof_settings').update({
      revisions_used: (settings.revisions_used || 0) + 1,
    }).eq('id', settings.id)

    setProofs(prev => prev.map(p => p.id === latestProof.id
      ? { ...p, customer_status: 'revision_requested', customer_feedback: feedback }
      : p
    ))
    setSettings((s: any) => ({ ...s, revisions_used: (s.revisions_used || 0) + 1 }))
    setFeedback('')
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8892a8' }}>Loading...</div>
  if (!settings) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Invalid or expired link.</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#e8ecf4' }}>USA WRAP CO</div>
        <div style={{ fontSize: 14, color: '#8892a8', marginTop: 4 }}>Design Proof Review</div>
      </div>

      {/* Revision counter */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24,
        padding: '12px 20px', background: '#111827', borderRadius: 10, border: '1px solid #1e2d4a',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6478', textTransform: 'uppercase' }}>Version</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#4f7fff' }}>{latestProof?.version_number || 0}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6478', textTransform: 'uppercase' }}>Revisions Used</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{settings.revisions_used} / {settings.max_revisions}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6478', textTransform: 'uppercase' }}>Remaining</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: revisionsLeft > 0 ? '#22c55e' : '#ef4444' }}>{revisionsLeft}</div>
        </div>
      </div>

      {proofs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#5a6478' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#8892a8' }}>Design in Progress</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Your design proof will appear here once our team uploads it. Check back soon!</div>
        </div>
      ) : (
        <>
          {/* Latest proof */}
          <div style={{
            background: '#111827', border: '1px solid #1e2d4a', borderRadius: 16, overflow: 'hidden', marginBottom: 24,
          }}>
            <div style={{ padding: 4, background: '#0c1222' }}>
              <img src={latestProof.image_url} alt={`Proof v${latestProof.version_number}`}
                style={{ width: '100%', borderRadius: 12 }} />
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e8ecf4' }}>
                  Proof Version {latestProof.version_number}
                </div>
                <StatusBadge status={latestProof.customer_status} />
              </div>

              {latestProof.designer_notes && (
                <div style={{ fontSize: 12, color: '#8892a8', padding: '8px 12px', background: '#0c1222', borderRadius: 8, marginBottom: 12 }}>
                  <strong>Designer Notes:</strong> {latestProof.designer_notes}
                </div>
              )}

              {/* Already approved */}
              {latestProof.customer_status === 'approved' && (
                <div style={{ padding: 16, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#22c55e' }}>Design Approved</div>
                  <div style={{ fontSize: 12, color: '#8892a8', marginTop: 4 }}>
                    Approved by {latestProof.customer_name_confirm} on {new Date(latestProof.customer_approved_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Revision requested */}
              {latestProof.customer_status === 'revision_requested' && (
                <div style={{ padding: 16, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Revision Requested</div>
                  <div style={{ fontSize: 12, color: '#8892a8' }}>{latestProof.customer_feedback}</div>
                </div>
              )}

              {/* Pending — show actions */}
              {latestProof.customer_status === 'pending' && (
                <div>
                  {/* Feedback */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#5a6478', textTransform: 'uppercase', marginBottom: 6 }}>
                      Your Feedback {revisionsLeft <= 0 ? '(no revisions remaining)' : ''}
                    </label>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      rows={3}
                      placeholder="Share your thoughts — what do you like? What needs to change?"
                      style={{
                        width: '100%', background: '#0c1222', border: '1px solid #1e2d4a',
                        borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e8ecf4', outline: 'none', resize: 'none',
                      }}
                    />
                  </div>

                  {/* Approval section */}
                  <div style={{ padding: 16, background: '#0c1222', borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#e8ecf4', marginBottom: 12 }}>
                      To approve this design:
                    </div>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                      <input type="checkbox" checked={responsibilityAccepted}
                        onChange={e => setResponsibilityAccepted(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 2, accentColor: '#22c55e' }} />
                      <span style={{ fontSize: 12, color: '#8892a8', lineHeight: 1.5 }}>
                        I have reviewed the design proof and <strong style={{ color: '#e8ecf4' }}>accept full responsibility</strong> for
                        the layout, spelling, grammar, color accuracy, and overall design. I understand that once approved,
                        changes may incur additional fees.
                      </span>
                    </label>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#5a6478', textTransform: 'uppercase', marginBottom: 6 }}>
                        Type your full name to approve
                      </label>
                      <input
                        value={confirmName}
                        onChange={e => setConfirmName(e.target.value)}
                        placeholder="John Smith"
                        style={{
                          width: '100%', background: '#111827', border: '1px solid #1e2d4a',
                          borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e8ecf4', outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={approveDesign}
                      disabled={!confirmName || !responsibilityAccepted || saving}
                      style={{
                        flex: 1, padding: '14px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                        cursor: 'pointer', border: 'none',
                        background: confirmName && responsibilityAccepted ? '#22c55e' : '#1a2540',
                        color: confirmName && responsibilityAccepted ? '#0d1a10' : '#5a6478',
                      }}>
                      ✓ Approve Design
                    </button>
                    <button onClick={requestRevision}
                      disabled={!feedback.trim() || revisionsLeft <= 0 || saving}
                      style={{
                        flex: 1, padding: '14px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                        cursor: revisionsLeft > 0 && feedback.trim() ? 'pointer' : 'not-allowed', border: 'none',
                        background: '#f59e0b15', color: revisionsLeft > 0 ? '#f59e0b' : '#5a6478',
                        border: '1px solid #f59e0b30',
                      }}>
                      ✎ Request Revision ({revisionsLeft} left)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Previous versions */}
          {proofs.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6478', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                Previous Versions
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {proofs.slice(1).map(p => (
                  <div key={p.id} style={{ width: 120, background: '#111827', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e2d4a' }}>
                    <img src={p.image_url} alt={`v${p.version_number}`} style={{ width: '100%' }} />
                    <div style={{ padding: '4px 8px', fontSize: 10, color: '#5a6478' }}>
                      v{p.version_number} · <StatusBadge status={p.customer_status} small />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#f59e0b15', color: '#f59e0b', label: 'Awaiting Review' },
    approved: { bg: '#22c55e15', color: '#22c55e', label: 'Approved ✓' },
    revision_requested: { bg: '#ef444415', color: '#ef4444', label: 'Revision Requested' },
  }
  const c = config[status] || config.pending
  return (
    <span style={{
      padding: small ? '1px 6px' : '3px 10px', borderRadius: 6,
      fontSize: small ? 8 : 10, fontWeight: 800,
      background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  )
}
