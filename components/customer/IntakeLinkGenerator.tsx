'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface IntakeLinkGeneratorProps {
  projectId: string
  orgId: string
}

export default function IntakeLinkGenerator({ projectId, orgId }: IntakeLinkGeneratorProps) {
  const [intake, setIntake] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('customer_intake')
        .select('*')
        .eq('project_id', projectId)
        .single()
      if (data) setIntake(data)
      setLoading(false)
    }
    load()
  }, [projectId])

  const createLink = async () => {
    const { data } = await supabase
      .from('customer_intake')
      .insert({ org_id: orgId, project_id: projectId })
      .select()
      .single()
    if (data) setIntake(data)
  }

  const createProofingLink = async () => {
    const { data: existing } = await supabase
      .from('proof_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      const { data } = await supabase
        .from('proof_settings')
        .insert({ org_id: orgId, project_id: projectId, max_revisions: 3 })
        .select()
        .single()
      if (data) setIntake((i: any) => ({ ...i, _proofToken: data.proofing_token, _proofSettings: data }))
    } else {
      setIntake((i: any) => ({ ...i, _proofToken: existing.proofing_token, _proofSettings: existing }))
    }
  }

  const copyLink = (url: string, key: string) => {
    navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const intakeUrl = intake ? `${baseUrl}/intake/${intake.token}` : ''
  const proofUrl = intake?._proofToken ? `${baseUrl}/proof/${intake._proofToken}` : ''

  if (loading) return null

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text1)', marginBottom: 12 }}>🔗 Customer Links</div>

      {/* Intake link */}
      {!intake ? (
        <button onClick={createLink} style={{
          width: '100%', padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
          cursor: 'pointer', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--accent)',
        }}>
          📥 Generate Customer Intake Link
        </button>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>INTAKE LINK</span>
            {intake.completed && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#22c55e20', color: '#22c55e' }}>COMPLETED ✓</span>}
            {!intake.completed && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#f59e0b20', color: '#f59e0b' }}>PENDING</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={intakeUrl} style={{
              flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text2)',
              fontFamily: 'JetBrains Mono, monospace',
            }} />
            <button onClick={() => copyLink(intakeUrl, 'intake')} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', border: 'none',
              background: copied === 'intake' ? 'var(--green)' : 'var(--accent)',
              color: '#fff',
            }}>
              {copied === 'intake' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          {/* Intake progress */}
          {intake.completed && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.05)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: 'var(--text2)' }}>
                {intake.customer_name && <span>👤 {intake.customer_name} · </span>}
                {intake.customer_email && <span>📧 {intake.customer_email} · </span>}
                {(intake.vehicle_photos || []).length} photos · {(intake.logo_files || []).length} logos
                {intake.removal_required && <span style={{ color: '#f59e0b' }}> · ⚠ Removal required</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Proofing link */}
      {intake && (
        <>
          {!intake._proofToken ? (
            <button onClick={createProofingLink} style={{
              width: '100%', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 12,
              cursor: 'pointer', border: '1px dashed var(--border)', background: 'transparent', color: '#8b5cf6',
              marginTop: 8,
            }}>
              🎨 Generate Customer Proofing Link
            </button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>PROOFING LINK</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#8b5cf620', color: '#8b5cf6' }}>
                  {intake._proofSettings?.revisions_used || 0}/{intake._proofSettings?.max_revisions || 3} revisions
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input readOnly value={proofUrl} style={{
                  flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text2)',
                  fontFamily: 'JetBrains Mono, monospace',
                }} />
                <button onClick={() => copyLink(proofUrl, 'proof')} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: copied === 'proof' ? 'var(--green)' : '#8b5cf6',
                  color: '#fff',
                }}>
                  {copied === 'proof' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
