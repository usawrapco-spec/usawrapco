'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ProjectType } from '@/types'

interface NewProjectModalProps {
  profile: Profile
  onClose: () => void
  onCreated: () => void
}

type Step = 'type' | 'details'

export default function NewProjectModal({ profile, onClose, onCreated }: NewProjectModalProps) {
  const [step, setStep] = useState<Step>('type')
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [clientName, setClientName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [vehicleDesc, setVehicleDesc] = useState('')
  const [installDate, setInstallDate] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  const TYPE_OPTIONS: { type: ProjectType; icon: string; label: string; desc: string }[] = [
    { type: 'wrap',    icon: '🚗', label: 'Vehicle Wrap',  desc: 'Commercial · Fleet · Marine · PPF' },
    { type: 'decking', icon: '⛵', label: 'Boat Decking',  desc: 'EVA foam · SeaDek · Teak' },
    { type: 'design',  icon: '🎨', label: 'Design Only',   desc: 'Artwork · Proofs · Approvals' },
    { type: 'ppf',     icon: '🛡', label: 'PPF / Tint',    desc: 'Paint protection film' },
  ]

  async function handleCreate() {
    if (!projectType || !clientName.trim()) {
      setError('Client name is required.')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.from('projects').insert({
      org_id:       profile.org_id,
      type:         projectType,
      title:        businessName || clientName,
      status:       'estimate',
      agent_id:     profile.role === 'sales' || profile.role === 'admin' ? profile.id : null,
      division:     projectType === 'decking' ? 'decking' : 'wraps',
      pipe_stage:   'sales_in',
      vehicle_desc: vehicleDesc || null,
      install_date: installDate || null,
      form_data: {
        clientName,
        businessName,
        notes,
      },
      fin_data: null,
      actuals: {},
      checkout: {},
      send_backs: [],
    }).select().single()

    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card anim-pop-in w-full max-w-lg" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="font-display text-xl font-900" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {step === 'type' ? '＋ New Project' : `New ${TYPE_OPTIONS.find(t => t.type === projectType)?.label}`}
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1 text-lg">✕</button>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === 'type' ? (
            <>
              <p className="text-sm text-text3 mb-4">What type of project are you creating?</p>
              <div className="grid grid-cols-2 gap-3">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => { setProjectType(opt.type); setStep('details') }}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border
                               bg-surface2 hover:border-accent hover:bg-accent/5 transition-all text-center"
                  >
                    <span className="text-4xl">{opt.icon}</span>
                    <div>
                      <div className="font-800 text-text1 text-sm">{opt.label}</div>
                      <div className="text-xs text-text3 mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red/10 border border-red/30 text-red text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="field-label">Client Name *</label>
                  <input
                    className="field"
                    placeholder="John Smith"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Business Name</label>
                  <input
                    className="field"
                    placeholder="Smith Logistics LLC"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                  />
                </div>
              </div>

              {projectType !== 'design' && (
                <div className="mb-4">
                  <label className="field-label">Vehicle / Unit Description</label>
                  <input
                    className="field"
                    placeholder="2023 Ford Transit 350 — White"
                    value={vehicleDesc}
                    onChange={e => setVehicleDesc(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="field-label">Target Install Date</label>
                <input
                  type="date"
                  className="field"
                  value={installDate}
                  onChange={e => setInstallDate(e.target.value)}
                />
              </div>

              <div className="mb-5">
                <label className="field-label">Notes</label>
                <textarea
                  className="field resize-none"
                  rows={2}
                  placeholder="Initial notes, referral, any context…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="btn-ghost flex-1"
                  onClick={() => setStep('type')}
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? 'Creating…' : 'Create Project →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
