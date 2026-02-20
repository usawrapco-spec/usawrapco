'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MaterialTrackingProps {
  projectId: string
  orgId: string
  userId: string
  project: any
}

export default function MaterialTracking({ projectId, orgId, userId, project }: MaterialTrackingProps) {
  const [data, setData] = useState<any>(null)
  const [form, setForm] = useState({
    quoted_sqft: '',
    actual_sqft: '',
    linear_ft_printed: '',
    print_width_inches: '54',
    material_type: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fin = (project.fin_data as any) || {}
  const fd = (project.form_data as any) || {}

  useEffect(() => {
    const load = async () => {
      const { data: existing } = await supabase
        .from('material_tracking')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (existing) {
        setData(existing)
        setForm({
          quoted_sqft: existing.quoted_sqft?.toString() || fd.sqft || '',
          actual_sqft: existing.actual_sqft?.toString() || '',
          linear_ft_printed: existing.linear_ft_printed?.toString() || '',
          print_width_inches: existing.print_width_inches?.toString() || '54',
          material_type: existing.material_type || '',
        })
      } else {
        setForm(f => ({
          ...f,
          quoted_sqft: fd.sqft || '',
          material_type: fd.matRate ? `Rate: $${fd.matRate}/sqft` : '',
        }))
      }
    }
    load()
  }, [projectId])

  // Compute buffer
  const quotedSqft = parseFloat(form.quoted_sqft) || 0
  const actualSqft = parseFloat(form.actual_sqft) || 0
  const linearFt = parseFloat(form.linear_ft_printed) || 0
  const printWidth = parseFloat(form.print_width_inches) || 54

  // Convert linear ft printed to sqft (width in inches / 12 * linear ft)
  const printedSqft = linearFt * (printWidth / 12)
  const bufferSqft = printedSqft - quotedSqft
  const bufferPct = quotedSqft > 0 ? ((bufferSqft / quotedSqft) * 100).toFixed(0) : '0'

  const saveTracking = async () => {
    setSaving(true)
    await supabase.from('material_tracking').upsert({
      org_id: orgId,
      project_id: projectId,
      quoted_sqft: quotedSqft || null,
      actual_sqft: actualSqft || null,
      linear_ft_printed: linearFt || null,
      print_width_inches: printWidth,
      buffer_pct: parseFloat(bufferPct) || null,
      material_type: form.material_type || null,
      logged_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' })
    setSaving(false)
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>
        Material Usage Tracking
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Quoted Net Sqft
          </label>
          <input
            type="number"
            value={form.quoted_sqft}
            onChange={e => setForm(f => ({ ...f, quoted_sqft: e.target.value }))}
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Actual Sqft Used
          </label>
          <input
            type="number"
            value={form.actual_sqft}
            onChange={e => setForm(f => ({ ...f, actual_sqft: e.target.value }))}
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Linear Ft Printed ({printWidth}" wide)
          </label>
          <input
            type="number"
            value={form.linear_ft_printed}
            onChange={e => setForm(f => ({ ...f, linear_ft_printed: e.target.value }))}
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Buffer calculation */}
      {linearFt > 0 && quotedSqft > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {printWidth}" @ {linearFt}lf = <strong>{Math.round(printedSqft)} sqft printed</strong>
            &nbsp;&nbsp;Quoted: {quotedSqft} sqft
            &nbsp;&nbsp;<span style={{
              fontWeight: 800,
              color: parseFloat(bufferPct) <= 15 ? 'var(--green)' : parseFloat(bufferPct) <= 25 ? '#f59e0b' : '#ef4444',
            }}>
              Buffer: +{bufferPct}%
            </span>
          </div>
          {bufferSqft > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              10% buffer = {Math.round(quotedSqft * 0.1)} sqft cushion
            </div>
          )}
        </div>
      )}

      <button onClick={saveTracking} disabled={saving} style={{
        padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
        background: 'var(--accent)', border: 'none', color: '#fff', opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Saving...' : '💾 Save Material Log'}
      </button>
    </div>
  )
}
