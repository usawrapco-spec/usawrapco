'use client'

import { useState } from 'react'
import { CheckCircle, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react'

interface Props {
  annotationCount: number
  onSubmit: (decision: 'approved' | 'changes_requested', note: string) => Promise<void>
  onBack: () => void
}

export default function DecisionScreen({ annotationCount, onSubmit, onBack }: Props) {
  const [decision, setDecision] = useState<'approved' | 'changes_requested' | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!decision) return
    setSubmitting(true)
    try {
      await onSubmit(decision, note)
      setDone(true)
    } catch {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        gap: 16,
        minHeight: 400,
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: decision === 'approved' ? 'rgba(34,192,122,0.15)' : 'rgba(245,158,11,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {decision === 'approved'
            ? <CheckCircle size={32} color="#22c07a" />
            : <RefreshCw size={32} color="#f59e0b" />
          }
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#e8eaed', margin: 0, textAlign: 'center' }}>
          {decision === 'approved' ? 'Design Approved!' : 'Changes Requested'}
        </h2>
        <p style={{ fontSize: 14, color: '#9299b5', textAlign: 'center', maxWidth: 400, margin: 0 }}>
          {decision === 'approved'
            ? 'Your design has been approved and the team will proceed with production.'
            : 'Your feedback has been sent to the design team. They will review your annotations and notes.'}
        </p>
        {annotationCount > 0 && (
          <p style={{ fontSize: 12, color: '#5a6080', margin: 0 }}>
            {annotationCount} annotation{annotationCount !== 1 ? 's' : ''} submitted
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: '24px 16px',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: '#9299b5',
          fontSize: 13,
          cursor: 'pointer',
          padding: 0,
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} /> Back to Annotations
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e8eaed', margin: 0 }}>
        Review & Submit
      </h2>

      {annotationCount > 0 && (
        <div style={{
          padding: '8px 14px',
          borderRadius: 8,
          background: 'rgba(79,127,255,0.08)',
          border: '1px solid rgba(79,127,255,0.15)',
          fontSize: 13,
          color: '#4f7fff',
          fontWeight: 600,
        }}>
          {annotationCount} annotation{annotationCount !== 1 ? 's' : ''} added
        </div>
      )}

      {/* Decision cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => setDecision('approved')}
          style={{
            padding: 20,
            borderRadius: 12,
            border: decision === 'approved' ? '2px solid #22c07a' : '2px solid rgba(34,192,122,0.2)',
            background: decision === 'approved' ? 'rgba(34,192,122,0.1)' : 'rgba(34,192,122,0.03)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <CheckCircle size={22} color="#22c07a" />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#22c07a' }}>Approve Design</span>
          </div>
          <p style={{ fontSize: 13, color: '#9299b5', margin: 0 }}>
            The design looks great, proceed to production.
          </p>
        </button>

        <button
          onClick={() => setDecision('changes_requested')}
          style={{
            padding: 20,
            borderRadius: 12,
            border: decision === 'changes_requested' ? '2px solid #f59e0b' : '2px solid rgba(245,158,11,0.2)',
            background: decision === 'changes_requested' ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.03)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <RefreshCw size={22} color="#f59e0b" />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>Request Changes</span>
          </div>
          <p style={{ fontSize: 13, color: '#9299b5', margin: 0 }}>
            I have feedback — please review my annotations and notes.
          </p>
        </button>
      </div>

      {/* Overall note */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#9299b5', marginBottom: 6 }}>
          Overall Note (optional)
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={decision === 'changes_requested'
            ? 'Describe what you would like changed...'
            : 'Any additional comments...'}
          rows={3}
          style={{
            width: '100%',
            background: '#1a1d27',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            color: '#e8eaed',
            padding: '10px 12px',
            fontSize: 14,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!decision || submitting}
        style={{
          padding: '14px 24px',
          borderRadius: 10,
          border: 'none',
          background: !decision ? '#2a2d37' :
            decision === 'approved' ? '#22c07a' : '#f59e0b',
          color: !decision ? '#5a6080' : '#000',
          fontSize: 15,
          fontWeight: 800,
          cursor: decision ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
        ) : decision === 'approved' ? (
          'Approve Design'
        ) : decision === 'changes_requested' ? (
          'Submit Change Request'
        ) : (
          'Choose a Decision Above'
        )}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
