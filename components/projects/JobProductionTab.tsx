'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Printer, Package, RefreshCw, DollarSign, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import DeptSignOffChecklist from '@/components/projects/DeptSignOffChecklist'
import type { Profile } from '@/types'

interface Props {
  projectId: string
  orgId: string
  profile: Profile
  formData: Record<string, any>
  onFormDataChange: (key: string, value: unknown) => void
  onCloseJob?: () => void
}

interface ProductionData {
  material_type: string
  laminate: string
  roll_width: string
  print_file_ref: string
  print_notes: string
  vinyl_ordered: string
  vinyl_used: string
  laminate_ordered: string
  laminate_used: string
  reprint_count: string
  reprint_reason: string
  reprint_cost: string
  extra_costs: Array<{ label: string; amount: string }>
  material_ordered_at?: string
  print_complete_at?: string
}

const DEFAULT_PROD: ProductionData = {
  material_type: '', laminate: '', roll_width: '', print_file_ref: '', print_notes: '',
  vinyl_ordered: '', vinyl_used: '', laminate_ordered: '', laminate_used: '',
  reprint_count: '0', reprint_reason: '', reprint_cost: '',
  extra_costs: [],
}

const MATERIAL_TYPES = ['Avery MPI 1105 Cast', 'Avery MPI 1005 Calendered', 'ORACAL 970RA Cast', 'ORACAL 651 Calendered', '3M 1080 Cast', 'PPF Clear', 'PPF Matte', 'Reflective Wrap', 'Perforated Window Film', 'Custom']
const LAMINATE_TYPES = ['Avery DOL 1360 Gloss', 'Avery DOL 1370 Matte', 'Mactac Gloss', 'Mactac Matte', 'No Laminate', 'Custom']

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif' }}>
      {children}
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12, fontWeight: 800, color: 'var(--text2)' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

function FInput({ label, value, onChange, onBlur, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }}
      />
    </div>
  )
}

export default function JobProductionTab({ projectId, orgId, profile, formData, onFormDataChange, onCloseJob }: Props) {
  const supabase = createClient()
  const [prod, setProd] = useState<ProductionData>({ ...DEFAULT_PROD, ...(formData.production_data || {}) })
  const [saving, setSaving] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)

  const save = useCallback(async (data: ProductionData) => {
    setSaving(true)
    const updated = { ...(formData), production_data: data }
    await supabase.from('projects').update({ form_data: updated }).eq('id', projectId)
    onFormDataChange('production_data', data)
    setSaving(false)
  }, [projectId, formData, onFormDataChange, supabase])

  function update(field: keyof ProductionData, value: string) {
    const next = { ...prod, [field]: value }
    setProd(next)
    save(next)
  }

  function addExtraCost() {
    const next = { ...prod, extra_costs: [...prod.extra_costs, { label: '', amount: '' }] }
    setProd(next)
    save(next)
  }

  function updateExtraCost(i: number, field: 'label' | 'amount', value: string) {
    const costs = [...prod.extra_costs]
    costs[i] = { ...costs[i], [field]: value }
    const next = { ...prod, extra_costs: costs }
    setProd(next)
    save(next)
  }

  function removeExtraCost(i: number) {
    const costs = prod.extra_costs.filter((_, idx) => idx !== i)
    const next = { ...prod, extra_costs: costs }
    setProd(next)
    save(next)
  }

  const vinylWaste = prod.vinyl_ordered && prod.vinyl_used
    ? Math.max(0, Math.round(((parseFloat(prod.vinyl_ordered) - parseFloat(prod.vinyl_used)) / parseFloat(prod.vinyl_ordered)) * 100))
    : null

  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }
  const selectStyle: React.CSSProperties = { ...inputStyle }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {saving && (
        <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right', marginBottom: 4 }}>Saving...</div>
      )}

      {/* Print Specifications */}
      <Section icon={<Printer size={13} style={{ color: 'var(--cyan)' }} />} title="Print Specifications">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={labelStyle}>Material Type</div>
            <select
              value={prod.material_type}
              onChange={e => update('material_type', e.target.value)}
              style={selectStyle}
            >
              <option value="">Select material…</option>
              {MATERIAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Laminate / Substrate</div>
            <select
              value={prod.laminate}
              onChange={e => update('laminate', e.target.value)}
              style={selectStyle}
            >
              <option value="">Select laminate…</option>
              {LAMINATE_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <FInput label="Roll Width (in)" value={prod.roll_width} onChange={v => update('roll_width', v)} placeholder='e.g. 54"' />
          <FInput label="Print File Reference" value={prod.print_file_ref} onChange={v => update('print_file_ref', v)} placeholder="File name, link, or job #" />
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={labelStyle}>Production Notes</div>
          <textarea
            value={prod.print_notes}
            onChange={e => update('print_notes', e.target.value)}
            placeholder="Printer settings, color notes, special instructions…"
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
          />
        </div>

        {/* Mark milestones */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const at = prod.material_ordered_at ? '' : new Date().toISOString()
              update('material_ordered_at' as any, at)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: prod.material_ordered_at ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.1)',
              color: prod.material_ordered_at ? 'var(--green)' : 'var(--accent)',
            }}
          >
            {prod.material_ordered_at ? <CheckCircle2 size={11} /> : <Circle size={11} />}
            Material Ordered
          </button>
          <button
            onClick={() => {
              const at = prod.print_complete_at ? '' : new Date().toISOString()
              update('print_complete_at' as any, at)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: prod.print_complete_at ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.1)',
              color: prod.print_complete_at ? 'var(--green)' : 'var(--accent)',
            }}
          >
            {prod.print_complete_at ? <CheckCircle2 size={11} /> : <Circle size={11} />}
            Print Complete
          </button>
        </div>
      </Section>

      {/* Material Usage */}
      <Section icon={<Package size={13} style={{ color: 'var(--purple)' }} />} title="Material Usage">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <FInput label="Vinyl Ordered (sqft)" type="number" value={prod.vinyl_ordered} onChange={v => update('vinyl_ordered', v)} placeholder="0" />
          <FInput label="Vinyl Used (sqft)" type="number" value={prod.vinyl_used} onChange={v => update('vinyl_used', v)} placeholder="0" />
          <FInput label="Laminate Ordered (sqft)" type="number" value={prod.laminate_ordered} onChange={v => update('laminate_ordered', v)} placeholder="0" />
          <FInput label="Laminate Used (sqft)" type="number" value={prod.laminate_used} onChange={v => update('laminate_used', v)} placeholder="0" />
        </div>

        {vinylWaste !== null && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: vinylWaste > 25 ? 'rgba(242,90,90,0.08)' : 'rgba(34,192,122,0.08)', border: `1px solid ${vinylWaste > 25 ? 'rgba(242,90,90,0.25)' : 'rgba(34,192,122,0.25)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Vinyl Waste:</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: vinylWaste > 25 ? 'var(--red)' : 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{vinylWaste}%</span>
            {vinylWaste > 25 && <span style={{ fontSize: 11, color: 'var(--red)' }}>— High waste, check for reprints</span>}
          </div>
        )}
      </Section>

      {/* Reprints */}
      <Section icon={<RefreshCw size={13} style={{ color: 'var(--amber)' }} />} title="Reprints">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FInput label="# of Reprints" type="number" value={prod.reprint_count} onChange={v => update('reprint_count', v)} placeholder="0" />
          <FInput label="Reprint Cost ($)" type="number" value={prod.reprint_cost} onChange={v => update('reprint_cost', v)} placeholder="0.00" />
          <div />
        </div>
        {parseInt(prod.reprint_count) > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={labelStyle}>Reprint Reason</div>
            <textarea
              value={prod.reprint_reason}
              onChange={e => update('reprint_reason', e.target.value)}
              placeholder="Color mismatch, print defect, customer change…"
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
            />
          </div>
        )}
      </Section>

      {/* Additional Costs */}
      <Section icon={<DollarSign size={13} style={{ color: 'var(--green)' }} />} title="Additional Costs">
        {prod.extra_costs.map((cost, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
            <div>
              {i === 0 && <div style={labelStyle}>Description</div>}
              <input
                value={cost.label}
                onChange={e => updateExtraCost(i, 'label', e.target.value)}
                placeholder="e.g. Rush fee, trim material"
                style={inputStyle}
              />
            </div>
            <div>
              {i === 0 && <div style={labelStyle}>Amount</div>}
              <input
                type="number"
                value={cost.amount}
                onChange={e => updateExtraCost(i, 'amount', e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => removeExtraCost(i)}
              style={{ height: 36, padding: '0 8px', borderRadius: 6, border: '1px solid rgba(242,90,90,0.25)', background: 'rgba(242,90,90,0.08)', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addExtraCost}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 4 }}
        >
          + Add Cost
        </button>
      </Section>

      {/* Production Sign-off Checklist */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <button
          onClick={() => setShowChecklist(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', textAlign: 'left' }}
        >
          {showChecklist ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>Production Sign-Off Checklist</span>
        </button>
        {showChecklist && (
          <div style={{ padding: '0 16px 16px' }}>
            <DeptSignOffChecklist
              projectId={projectId}
              orgId={orgId}
              profile={profile}
              onCloseJob={onCloseJob || (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  )
}
