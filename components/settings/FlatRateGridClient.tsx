'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Save, Check } from 'lucide-react'

interface FlatRate {
  id: string
  vehicle_category: string
  vehicle_label: string
  flat_rate: number
  budgeted_hours: number
  implied_hourly: number
  sqft_estimate: number | null
  active: boolean
  sort_order: number
}

interface Props {
  initialRates: FlatRate[]
  isAdmin: boolean
}

export default function FlatRateGridClient({ initialRates, isAdmin }: Props) {
  const [rates, setRates] = useState<FlatRate[]>(initialRates)
  const [editing, setEditing] = useState<Record<string, { flat_rate: string; budgeted_hours: string }>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function startEdit(rate: FlatRate) {
    if (!isAdmin) return
    setEditing(prev => ({
      ...prev,
      [rate.id]: {
        flat_rate: rate.flat_rate.toString(),
        budgeted_hours: rate.budgeted_hours.toString(),
      },
    }))
    setSaved(prev => ({ ...prev, [rate.id]: false }))
    setErrors(prev => ({ ...prev, [rate.id]: '' }))
  }

  function cancelEdit(id: string) {
    setEditing(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleChange(id: string, field: 'flat_rate' | 'budgeted_hours', val: string) {
    setEditing(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: val },
    }))
  }

  function saveRow(id: string) {
    const row = editing[id]
    if (!row) return

    const flat_rate = parseFloat(row.flat_rate)
    const budgeted_hours = parseFloat(row.budgeted_hours)

    if (isNaN(flat_rate) || flat_rate <= 0) {
      setErrors(prev => ({ ...prev, [id]: 'Flat rate must be a positive number' }))
      return
    }
    if (isNaN(budgeted_hours) || budgeted_hours <= 0) {
      setErrors(prev => ({ ...prev, [id]: 'Budgeted hours must be a positive number' }))
      return
    }

    startTransition(async () => {
      const { error } = await supabase
        .from('installer_flat_rates')
        .update({ flat_rate, budgeted_hours, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        setErrors(prev => ({ ...prev, [id]: error.message }))
        return
      }

      // Update local state
      setRates(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, flat_rate, budgeted_hours, implied_hourly: flat_rate / budgeted_hours }
            : r
        )
      )
      cancelEdit(id)
      setSaved(prev => ({ ...prev, [id]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2500)
    })
  }

  async function toggleActive(id: string, current: boolean) {
    if (!isAdmin) return
    const { error } = await supabase
      .from('installer_flat_rates')
      .update({ active: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setRates(prev => prev.map(r => r.id === id ? { ...r, active: !current } : r))
    }
  }

  const categories = Array.from(new Set(rates.map(r => r.vehicle_category)))

  return (
    <div>
      {/* Warning Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        background: 'color-mix(in srgb, var(--amber) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)',
        borderRadius: 10,
        marginBottom: 24,
      }}>
        <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--amber)', lineHeight: 1.5 }}>
          Rate changes take effect on the next pay period. Installers receive one full period advance notice.
        </p>
      </div>

      {categories.map(cat => {
        const catRates = rates.filter(r => r.vehicle_category === cat)
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--text3)',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid rgba(90,96,128,.15)',
            }}>
              {cat}
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid rgba(90,96,128,.2)', overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                padding: '10px 16px',
                borderBottom: '1px solid rgba(90,96,128,.15)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}>
                <span>Vehicle</span>
                <span style={{ textAlign: 'right' }}>Flat Rate</span>
                <span style={{ textAlign: 'right' }}>Budgeted Hrs</span>
                <span style={{ textAlign: 'right' }}>Implied $/hr</span>
                <span style={{ textAlign: 'right' }}>Sq Ft Est</span>
                <span style={{ textAlign: 'center' }}>Active</span>
              </div>

              {catRates.map((rate, idx) => {
                const isEditing = !!editing[rate.id]
                const isSaved = saved[rate.id]
                const err = errors[rate.id]
                const editVals = editing[rate.id]

                const previewImplied = isEditing
                  ? parseFloat(editVals.flat_rate) / parseFloat(editVals.budgeted_hours)
                  : rate.implied_hourly

                return (
                  <div key={rate.id}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                        padding: '12px 16px',
                        borderBottom: idx < catRates.length - 1 ? '1px solid rgba(90,96,128,.08)' : undefined,
                        alignItems: 'center',
                        background: isEditing ? 'var(--surface2)' : 'transparent',
                        transition: 'background 0.15s',
                        cursor: isAdmin && !isEditing ? 'pointer' : 'default',
                      }}
                      onClick={() => { if (!isEditing) startEdit(rate) }}
                      title={isAdmin && !isEditing ? 'Click to edit' : undefined}
                    >
                      {/* Vehicle label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: rate.active ? 'var(--text1)' : 'var(--text3)' }}>
                          {rate.vehicle_label}
                        </span>
                        {isSaved && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--green)' }}>
                            <Check size={12} /> Saved
                          </span>
                        )}
                      </div>

                      {/* Flat rate */}
                      <div style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editVals.flat_rate}
                            onChange={e => handleChange(rate.id, 'flat_rate', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: 80,
                              padding: '4px 8px',
                              background: 'var(--bg)',
                              border: '1px solid rgba(79,127,255,.5)',
                              borderRadius: 6,
                              color: 'var(--text1)',
                              fontSize: 13,
                              textAlign: 'right',
                            }}
                          />
                        ) : (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text1)' }}>
                            ${rate.flat_rate.toFixed(0)}
                          </span>
                        )}
                      </div>

                      {/* Budgeted hours */}
                      <div style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={editVals.budgeted_hours}
                            onChange={e => handleChange(rate.id, 'budgeted_hours', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: 70,
                              padding: '4px 8px',
                              background: 'var(--bg)',
                              border: '1px solid rgba(79,127,255,.5)',
                              borderRadius: 6,
                              color: 'var(--text1)',
                              fontSize: 13,
                              textAlign: 'right',
                            }}
                          />
                        ) : (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text2)' }}>
                            {rate.budgeted_hours}h
                          </span>
                        )}
                      </div>

                      {/* Implied $/hr */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 13,
                          color: !isNaN(previewImplied) && previewImplied > 0 ? 'var(--green)' : 'var(--text3)',
                        }}>
                          {!isNaN(previewImplied) && previewImplied > 0
                            ? `$${previewImplied.toFixed(2)}/hr`
                            : '—'}
                        </span>
                      </div>

                      {/* Sq ft */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text3)' }}>
                          {rate.sqft_estimate ?? '—'}
                        </span>
                      </div>

                      {/* Active toggle */}
                      <div style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleActive(rate.id, rate.active)}
                          disabled={!isAdmin}
                          style={{
                            width: 36,
                            height: 20,
                            borderRadius: 10,
                            border: 'none',
                            background: rate.active ? 'var(--green)' : 'rgba(90,96,128,.3)',
                            cursor: isAdmin ? 'pointer' : 'default',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: 2,
                            left: rate.active ? 18 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#fff',
                            transition: 'left 0.2s',
                          }} />
                        </button>
                      </div>
                    </div>

                    {/* Edit action row */}
                    {isEditing && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 8,
                        padding: '8px 16px 10px',
                        background: 'var(--surface2)',
                        borderBottom: idx < catRates.length - 1 ? '1px solid rgba(90,96,128,.08)' : undefined,
                      }}>
                        {err && (
                          <span style={{ fontSize: 12, color: 'var(--red)', marginRight: 8 }}>{err}</span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); cancelEdit(rate.id) }}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 7,
                            border: '1px solid rgba(90,96,128,.3)',
                            background: 'transparent',
                            color: 'var(--text2)',
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); saveRow(rate.id) }}
                          disabled={isPending}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 14px',
                            borderRadius: 7,
                            border: 'none',
                            background: 'var(--accent)',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Save size={13} />
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
