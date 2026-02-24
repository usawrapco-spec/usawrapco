'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { DesignProof, ProofAnnotation, AnnotationTool } from '@/lib/proof-types'
import AnnotationCanvas from './AnnotationCanvas'
import AnnotationToolbar from './AnnotationToolbar'
import DecisionScreen from './DecisionScreen'

interface Props {
  token: string
}

let idCounter = 0
function tempId() {
  return `temp-${Date.now()}-${++idCounter}`
}

export default function ProofFlow({ token }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proof, setProof] = useState<DesignProof | null>(null)
  const [annotations, setAnnotations] = useState<ProofAnnotation[]>([])
  const [step, setStep] = useState<1 | 2>(1)

  // Tool state
  const [activeTool, setActiveTool] = useState<AnnotationTool>('draw')
  const [activeColor, setActiveColor] = useState('#f25a5a')
  const [activeStamp, setActiveStamp] = useState('thumbsUp')

  // Fetch proof data
  useEffect(() => {
    fetch(`/api/proof/public/${token}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 410 ? 'This proof link has expired.' : 'Proof not found.')
        return r.json()
      })
      .then(data => {
        setProof(data.proof)
        // Load existing annotations (from previous sessions)
        if (data.annotations?.length > 0) {
          setAnnotations(data.annotations)
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleAddAnnotation = useCallback((ann: Omit<ProofAnnotation, 'id' | 'proof_id' | 'created_at'>) => {
    const full: ProofAnnotation = {
      ...ann,
      id: tempId(),
      proof_id: proof?.id || '',
      created_at: new Date().toISOString(),
    }
    setAnnotations(prev => [...prev, full])
  }, [proof?.id])

  const handleUndo = useCallback(() => {
    setAnnotations(prev => prev.slice(0, -1))
  }, [])

  const handleClearAll = useCallback(() => {
    if (annotations.length === 0) return
    if (confirm('Clear all annotations?')) {
      setAnnotations([])
    }
  }, [annotations.length])

  const handleColorChange = useCallback((color: string) => {
    // If stamp tool, color change encodes the stamp type
    if (activeTool === 'stamp') {
      setActiveStamp(color)
    } else {
      setActiveColor(color)
    }
  }, [activeTool])

  const handleSubmit = useCallback(async (decision: 'approved' | 'changes_requested', note: string) => {
    const res = await fetch(`/api/proof/public/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        annotations: annotations.map(a => ({
          type: a.type,
          color: a.color,
          data: a.data,
          page: a.page,
        })),
        overall_note: note,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Submission failed')
    }
  }, [token, annotations])

  // Already decided
  const alreadyDecided = proof?.status === 'approved' || proof?.status === 'changes_requested'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 10, color: '#9299b5' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 15 }}>Loading your proof...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
        <AlertTriangle size={32} color="#f25a5a" />
        <p style={{ fontSize: 16, color: '#f25a5a', fontWeight: 700 }}>{error}</p>
      </div>
    )
  }

  if (!proof) return null

  const projectTitle = proof.project?.title || 'Your Vehicle Wrap'
  const vehicleDesc = proof.project?.vehicle_desc || ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0a0f1e',
      color: '#e8eaed',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(79,127,255,0.1)',
        background: '#0d0f14',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>
          {proof.title || 'Design Proof'}
        </div>
        <div style={{ fontSize: 13, color: '#9299b5', marginTop: 2 }}>
          {projectTitle}{vehicleDesc ? ` — ${vehicleDesc}` : ''} &middot; Version {proof.version_number}
        </div>
        {proof.designer_notes && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(79,127,255,0.06)',
            borderLeft: '3px solid #4f7fff',
            fontSize: 13,
            color: '#9299b5',
          }}>
            {proof.designer_notes}
          </div>
        )}
        {proof.note_to_customer && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(79,127,255,0.06)',
            borderLeft: '3px solid #4f7fff',
            fontSize: 13,
            color: '#9299b5',
          }}>
            {proof.note_to_customer}
          </div>
        )}
      </div>

      {alreadyDecided ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 12,
          padding: 40,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: proof.status === 'approved' ? 'rgba(34,192,122,0.15)' : 'rgba(245,158,11,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: proof.status === 'approved' ? '#22c07a' : '#f59e0b',
            fontWeight: 800,
          }}>
            {proof.status === 'approved' ? '\u2714' : '\u21BB'}
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', margin: 0 }}>
            {proof.status === 'approved' ? 'Design Approved' : 'Changes Requested'}
          </p>
          <p style={{ fontSize: 13, color: '#5a6080', margin: 0 }}>
            This proof has already been submitted.
          </p>
        </div>
      ) : step === 1 ? (
        <>
          {/* Canvas area */}
          <div style={{ flex: 1, position: 'relative', minHeight: 300 }}>
            <AnnotationCanvas
              imageUrl={proof.image_url}
              annotations={annotations}
              activeTool={activeTool}
              activeColor={activeColor}
              activeStamp={activeStamp}
              onAddAnnotation={handleAddAnnotation}
            />
          </div>

          {/* Toolbar */}
          <div style={{ padding: '12px 16px' }}>
            <AnnotationToolbar
              activeTool={activeTool}
              activeColor={activeColor}
              annotationCount={annotations.length}
              onToolChange={setActiveTool}
              onColorChange={handleColorChange}
              onUndo={handleUndo}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Sticky CTA */}
          <div style={{
            padding: '12px 16px 20px',
            borderTop: '1px solid rgba(79,127,255,0.1)',
            background: '#0d0f14',
          }}>
            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 10,
                border: 'none',
                background: '#4f7fff',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Review & Submit
            </button>
          </div>
        </>
      ) : (
        <DecisionScreen
          annotationCount={annotations.length}
          onSubmit={handleSubmit}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}
