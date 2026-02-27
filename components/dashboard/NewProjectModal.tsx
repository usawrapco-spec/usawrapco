'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ProjectType } from '@/types'
import { clsx } from 'clsx'
import { Car, Anchor, Palette, Shield, X, type LucideIcon } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

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
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [vehicleDesc, setVehicleDesc] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [installDate, setInstallDate] = useState('')
  const [priority, setPriority] = useState<string>('normal')
  const [referral, setReferral] = useState('')
  const [notes, setNotes] = useState('')
  const [revenue, setRevenue] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const { xpToast, badgeToast } = useToast()

  const TYPE_OPTIONS: { type: ProjectType; Icon: LucideIcon; label: string; desc: string }[] = [
    { type: 'wrap',    Icon: Car,     label: 'Vehicle Wrap',  desc: 'Commercial · Fleet · Marine · Color Change' },
    { type: 'decking', Icon: Anchor,  label: 'Boat Decking',  desc: 'EVA foam · SeaDek · Teak alternatives' },
    { type: 'design',  Icon: Palette, label: 'Design Only',   desc: 'Artwork · Proofs · Approvals' },
    { type: 'ppf',     Icon: Shield,  label: 'PPF / Tint',    desc: 'Paint protection · Window tint' },
  ]

  const autoVehicleDesc = [vehicleYear, vehicleMake, vehicleModel, vehicleColor ? `— ${vehicleColor}` : '']
    .filter(Boolean).join(' ').trim()

  async function handleCreate() {
    if (!projectType || !clientName.trim()) {
      setError('Client name is required.')
      return
    }
    setLoading(true)
    setError('')

    const vDesc = vehicleDesc || autoVehicleDesc || null
    const revNum = revenue ? parseFloat(revenue) : null
    const finData = revNum ? { sales: revNum, revenue: revNum, cogs: 0, profit: revNum, gpm: 100, commission: 0, labor: 0, laborHrs: 0, material: 0, designFee: 0, misc: 0 } : null

    const { data, error: err } = await supabase.from('projects').insert({
      org_id:       profile.org_id,
      type:         projectType,
      title:        businessName || clientName,
      status:       'estimate',
      agent_id:     profile.role === 'sales_agent' || profile.role === 'admin' ? profile.id : null,
      division:     projectType === 'decking' ? 'decking' : 'wraps',
      pipe_stage:   'sales_in',
      vehicle_desc: vDesc,
      install_date: installDate || null,
      priority:     priority,
      referral:     referral || null,
      revenue:      revNum,
      fin_data:     finData,
      form_data: {
        clientName,
        clientEmail,
        clientPhone,
        businessName,
        vehicleYear, vehicleMake, vehicleModel, vehicleColor,
        notes,
      },
      actuals: {},
      checkout: {},
      send_backs: [],
    }).select().single()

    setLoading(false)
    if (err) { setError(err.message); return }
    // Award create_lead XP and show toast
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_lead', sourceType: 'project', sourceId: data?.id }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((res: {  amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
        if (res?.amount) xpToast(res.amount, 'New estimate created', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
      })
      .catch((error) => { console.error(error); })
    onCreated()
    // Redirect to Order Editor for full estimate configuration
    if (data?.id) {
      router.push(`/projects/${data.id}/edit`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card anim-pop-in w-full max-w-xl" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="font-display text-xl font-900" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            {step === 'type' ? '＋ New Estimate' : `New ${TYPE_OPTIONS.find(t => t.type === projectType)?.label}`}
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {step === 'type' ? (
            <>
              <p className="text-sm text-text3 mb-4">What type of project?</p>
              <div className="grid grid-cols-2 gap-3">
                {TYPE_OPTIONS.map(opt => (
                  <button key={opt.type}
                    onClick={() => { setProjectType(opt.type); setStep('details') }}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border
                               bg-surface2 hover:border-accent hover:bg-accent/5 transition-all text-center">
                    <opt.Icon size={40} className="text-text2" />
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

              {/* Client info */}
              <div className="section-label">Client Info</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="field-label">Client Name *</label>
                  <input className="field" placeholder="John Smith" value={clientName}
                    onChange={e => setClientName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="field-label">Business Name</label>
                  <input className="field" placeholder="Smith Logistics LLC" value={businessName}
                    onChange={e => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" className="field" placeholder="john@example.com" value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input className="field" placeholder="(555) 123-4567" value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)} />
                </div>
              </div>

              {/* Vehicle info */}
              {projectType !== 'design' && (
                <>
                  <div className="section-label">Vehicle / Unit</div>
                  <div className="grid grid-cols-4 gap-3 mb-2">
                    <div>
                      <label className="field-label">Year</label>
                      <input className="field" placeholder="2024" value={vehicleYear}
                        onChange={e => setVehicleYear(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Make</label>
                      <input className="field" placeholder="Ford" value={vehicleMake}
                        onChange={e => setVehicleMake(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Model</label>
                      <input className="field" placeholder="Transit 350" value={vehicleModel}
                        onChange={e => setVehicleModel(e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Color</label>
                      <input className="field" placeholder="White" value={vehicleColor}
                        onChange={e => setVehicleColor(e.target.value)} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="field-label">Or free-text description</label>
                    <input className="field" placeholder="Custom vehicle description"
                      value={vehicleDesc} onChange={e => setVehicleDesc(e.target.value)} />
                    {autoVehicleDesc && !vehicleDesc && (
                      <div className="text-xs text-text3 mt-1">Auto: {autoVehicleDesc}</div>
                    )}
                  </div>
                </>
              )}

              {/* Job details */}
              <div className="section-label">Job Details</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="field-label">Quote Amount ($)</label>
                  <input type="number" className="field" placeholder="0.00" value={revenue}
                    onChange={e => setRevenue(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Priority</label>
                  <select className="field" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Install Date</label>
                  <input type="date" className="field" value={installDate}
                    onChange={e => setInstallDate(e.target.value)} />
                </div>
              </div>

              <div className="mb-4">
                <label className="field-label">Referral Source</label>
                <input className="field" placeholder="Google, walk-in, referral from Jane…" value={referral}
                  onChange={e => setReferral(e.target.value)} />
              </div>

              <div className="mb-5">
                <label className="field-label">Notes</label>
                <textarea className="field resize-none" rows={2}
                  placeholder="Scope, special instructions, anything else…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setStep('type')} disabled={loading}>
                  ← Back
                </button>
                <button className="btn-primary flex-1" onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creating…' : 'Create Estimate →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
