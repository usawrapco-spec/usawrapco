'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, MapPin, User, CheckCircle2, Circle, Camera, UserCheck, ChevronDown, ChevronRight, MessageSquare, Timer, Play, Pause, StopCircle, Package } from 'lucide-react'
import JobChat from '@/components/chat/JobChat'
import JobPhotosTab from '@/components/projects/JobPhotosTab'
import type { Profile } from '@/types'

interface Props {
  projectId: string
  orgId: string
  profile: Profile
  formData: Record<string, any>
  onFormDataChange: (key: string, value: unknown) => void
  customerName?: string
  installerName?: string
}

interface InstallContact {
  name: string
  phone: string
  company: string
  address: string
  notes: string
}

interface DropoffInspection {
  dropped_by: string
  received_by: string
  received_at: string
  notes: string
  customer_signed: boolean
}

interface InstallChecklist {
  vehicle_received: boolean
  surface_prep: boolean
  vinyl_verified: boolean
  install_complete: boolean
  post_heat: boolean
  no_defects: boolean
  walkthrough: boolean
  vehicle_returned: boolean
}

const CHECKLIST_ITEMS: { key: keyof InstallChecklist; label: string }[] = [
  { key: 'vehicle_received', label: 'Vehicle received & inspected' },
  { key: 'surface_prep', label: 'Surface prep complete (clean, degrease, dry)' },
  { key: 'vinyl_verified', label: 'Vinyl & laminate verified (correct material)' },
  { key: 'install_complete', label: 'Installation complete' },
  { key: 'post_heat', label: 'Post-heat applied to all edges & recesses' },
  { key: 'no_defects', label: 'No defects (bubbles, lifts, creases, misalignment)' },
  { key: 'walkthrough', label: 'Customer walkthrough complete' },
  { key: 'vehicle_returned', label: 'Vehicle returned / delivery confirmed' },
]

const DEFAULT_CONTACT: InstallContact = { name: '', phone: '', company: '', address: '', notes: '' }
const DEFAULT_INSPECTION: DropoffInspection = { dropped_by: '', received_by: '', received_at: '', notes: '', customer_signed: false }
const DEFAULT_CHECKLIST: InstallChecklist = { vehicle_received: false, surface_prep: false, vinyl_verified: false, install_complete: false, post_heat: false, no_defects: false, walkthrough: false, vehicle_returned: false }

function SectionHeader({ icon, title, open, onToggle }: { icon: React.ReactNode; title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', textAlign: 'left' }}
    >
      {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      {icon}
      <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>{title}</span>
    </button>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif', display: 'block' }
const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }

export default function JobInstallTab({ projectId, orgId, profile, formData, onFormDataChange, customerName, installerName }: Props) {
  const supabase = createClient()
  const [contact, setContact] = useState<InstallContact>({ ...DEFAULT_CONTACT, ...(formData.install_contact || {}) })
  const [inspection, setInspection] = useState<DropoffInspection>({ ...DEFAULT_INSPECTION, ...(formData.dropoff_inspection || {}) })
  const [checklist, setChecklist] = useState<InstallChecklist>({ ...DEFAULT_CHECKLIST, ...(formData.install_checklist || {}) })
  const [signoffName, setSignoffName] = useState<string>((formData.install_signoff_name as string) || '')
  const [signoffConfirmed, setSignoffConfirmed] = useState<boolean>(!!(formData.install_signoff_confirmed))

  // Time tracking state
  const TIMER_KEY = `install_timer_${projectId}`
  const [filmAccepted, setFilmAccepted] = useState<boolean>(!!(formData.film_accepted))
  const [timerRunning, setTimerRunning] = useState<boolean>(false)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [timerElapsed, setTimerElapsed] = useState<number>(0) // seconds
  const [timerSessionId, setTimerSessionId] = useState<string | null>(null)
  const [postInstallChecklist, setPostInstallChecklist] = useState<Record<string, boolean>>(formData.post_install_checklist || {})
  const [timerSaved, setTimerSaved] = useState<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load timer from localStorage on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(TIMER_KEY) : null
    if (stored) {
      const { startTime, sessionId } = JSON.parse(stored)
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      setTimerStartTime(startTime)
      setTimerElapsed(elapsed)
      setTimerRunning(true)
      setTimerSessionId(sessionId)
    }
  }, [TIMER_KEY])

  // Timer tick
  useEffect(() => {
    if (timerRunning && timerStartTime) {
      timerRef.current = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - timerStartTime) / 1000))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning, timerStartTime])

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  async function startTimer() {
    if (!filmAccepted) return
    const startTime = Date.now()
    const { data } = await supabase.from('install_sessions').insert({
      project_id: projectId,
      org_id: orgId,
      installer_id: profile.id,
      start_time: new Date(startTime).toISOString(),
      status: 'active',
    }).select('id').single()
    const sessionId = data?.id || null
    setTimerStartTime(startTime)
    setTimerElapsed(0)
    setTimerRunning(true)
    setTimerSessionId(sessionId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ startTime, sessionId }))
    }
  }

  function pauseTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false)
    if (typeof window !== 'undefined') localStorage.removeItem(TIMER_KEY)
  }

  function resumeTimer() {
    if (!timerStartTime) return
    // Recalculate start time to account for paused time
    const newStart = Date.now() - (timerElapsed * 1000)
    setTimerStartTime(newStart)
    setTimerRunning(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ startTime: newStart, sessionId: timerSessionId }))
    }
  }

  async function submitTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    const hours = timerElapsed / 3600
    if (timerSessionId) {
      await supabase.from('install_sessions').update({
        end_time: new Date().toISOString(),
        duration_hours: Math.round(hours * 100) / 100,
        status: 'complete',
      }).eq('id', timerSessionId)
    }
    setTimerRunning(false)
    setTimerSaved(true)
    if (typeof window !== 'undefined') localStorage.removeItem(TIMER_KEY)
    await saveFormField('install_time_hours', Math.round(hours * 100) / 100)
  }

  const POST_INSTALL = [
    { key: 'heat_torch', label: 'Final heat torch applied to all edges & recesses' },
    { key: 'wipe_down', label: 'Wipe-down complete (squeegee marks, adhesive residue)' },
    { key: 'logo_sticker', label: 'USA WRAP CO logo sticker applied' },
    { key: 'no_defects_final', label: 'Final inspection — no visible defects' },
  ]

  const postInstallDone = POST_INSTALL.filter(i => postInstallChecklist[i.key]).length
  const canSubmit = postInstallDone === POST_INSTALL.length

  const [openSections, setOpenSections] = useState({ contact: true, inspection: false, checklist: false, signoff: false, photos: false, chat: false, timer: false })

  const saveFormField = useCallback(async (key: string, value: unknown) => {
    const updated = { ...formData, [key]: value }
    await supabase.from('projects').update({ form_data: updated }).eq('id', projectId)
    onFormDataChange(key, value)
  }, [projectId, formData, onFormDataChange, supabase])

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections(s => ({ ...s, [key]: !s[key] }))
  }

  function updateContact(field: keyof InstallContact, value: string) {
    const next = { ...contact, [field]: value }
    setContact(next)
    saveFormField('install_contact', next)
  }

  function updateInspection(field: keyof DropoffInspection, value: string | boolean) {
    const next = { ...inspection, [field]: value }
    setInspection(next)
    saveFormField('dropoff_inspection', next)
  }

  function toggleChecklistItem(key: keyof InstallChecklist) {
    const next = { ...checklist, [key]: !checklist[key] }
    setChecklist(next)
    saveFormField('install_checklist', next)
  }

  const checklistDone = CHECKLIST_ITEMS.filter(i => checklist[i.key]).length
  const checklistTotal = CHECKLIST_ITEMS.length
  const allChecklistDone = checklistDone === checklistTotal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* On-Site Contact */}
      <div style={cardStyle}>
        <SectionHeader icon={<Phone size={12} style={{ color: 'var(--cyan)' }} />} title="On-Site Contact" open={openSections.contact} onToggle={() => toggleSection('contact')} />
        {openSections.contact && (
          <div style={{ padding: '0 16px 16px' }}>
            {contact.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--cyan)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                  {contact.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{contact.name}</div>
                  {contact.company && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{contact.company}</div>}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} style={{ fontSize: 12, color: 'var(--cyan)', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>{contact.phone}</a>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['name', 'company', 'phone', 'address'] as const).map(f => (
                <div key={f}>
                  <label style={labelStyle}>{f === 'name' ? 'Contact Name' : f === 'company' ? 'Company' : f === 'phone' ? 'Phone' : 'Address'}</label>
                  <input
                    value={contact[f]}
                    onChange={e => updateContact(f, e.target.value)}
                    placeholder={f === 'phone' ? '(xxx) xxx-xxxx' : f === 'address' ? '123 Main St' : ''}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Site Notes</label>
              <textarea
                value={contact.notes}
                onChange={e => updateContact('notes', e.target.value)}
                placeholder="Gate codes, parking, contact hours, site access instructions…"
                style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Drop-off Inspection */}
      <div style={cardStyle}>
        <SectionHeader icon={<Camera size={12} style={{ color: 'var(--amber)' }} />} title="Drop-off Inspection" open={openSections.inspection} onToggle={() => toggleSection('inspection')} />
        {openSections.inspection && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Dropped Off By</label>
                <input value={inspection.dropped_by} onChange={e => updateInspection('dropped_by', e.target.value)} placeholder="Driver / customer name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Received By (Installer)</label>
                <input value={inspection.received_by} onChange={e => updateInspection('received_by', e.target.value)} placeholder="Installer name" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Drop-off Date & Time</label>
              <input type="datetime-local" value={inspection.received_at?.slice(0, 16) || ''} onChange={e => updateInspection('received_at', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Pre-install Notes (existing damage, condition)</label>
              <textarea value={inspection.notes} onChange={e => updateInspection('notes', e.target.value)} placeholder="Document any pre-existing damage, dents, scratches, rust, existing vinyl…" style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} />
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>UPLOAD DROP-OFF PHOTOS</div>
              <JobPhotosTab projectId={projectId} orgId={orgId} currentUserId={profile.id} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, border: `1px solid ${inspection.customer_signed ? 'rgba(34,192,122,0.35)' : 'rgba(255,255,255,0.08)'}`, background: inspection.customer_signed ? 'rgba(34,192,122,0.08)' : 'var(--surface2)' }}>
              <input
                type="checkbox"
                checked={inspection.customer_signed}
                onChange={e => updateInspection('customer_signed', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: inspection.customer_signed ? 'var(--green)' : 'var(--text2)' }}>
                {inspection.dropped_by || 'Customer'} has signed off on the pre-install vehicle condition
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Install Checklist */}
      <div style={cardStyle}>
        <SectionHeader
          icon={<CheckCircle2 size={12} style={{ color: 'var(--green)' }} />}
          title={`Install Checklist (${checklistDone}/${checklistTotal})`}
          open={openSections.checklist}
          onToggle={() => toggleSection('checklist')}
        />
        {openSections.checklist && (
          <div style={{ padding: '0 16px 16px' }}>
            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(checklistDone / checklistTotal) * 100}%`, background: allChecklistDone ? 'var(--green)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CHECKLIST_ITEMS.map(item => (
                <label
                  key={item.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: checklist[item.key] ? 'rgba(34,192,122,0.06)' : 'var(--surface2)', border: `1px solid ${checklist[item.key] ? 'rgba(34,192,122,0.25)' : 'transparent'}` }}
                >
                  <input type="checkbox" checked={checklist[item.key]} onChange={() => toggleChecklistItem(item.key)} style={{ width: 15, height: 15, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: checklist[item.key] ? 'var(--green)' : 'var(--text2)' }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer Post-Install Sign-Off */}
      <div style={cardStyle}>
        <SectionHeader icon={<UserCheck size={12} style={{ color: 'var(--purple)' }} />} title="Customer Post-Install Sign-Off" open={openSections.signoff} onToggle={() => toggleSection('signoff')} />
        {openSections.signoff && (
          <div style={{ padding: '0 16px 16px' }}>
            {signoffConfirmed && signoffName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 8, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.3)', marginBottom: 12 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Signed off by {signoffName}</span>
              </div>
            ) : null}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Customer Name</label>
              <input
                value={signoffName}
                onChange={e => setSignoffName(e.target.value)}
                onBlur={() => saveFormField('install_signoff_name', signoffName)}
                placeholder="Full name of customer or representative"
                style={{ ...inputStyle, borderColor: !signoffName && signoffConfirmed ? 'var(--red)' : undefined }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 8, background: signoffConfirmed ? 'rgba(34,192,122,0.08)' : 'var(--surface2)', border: `1px solid ${signoffConfirmed ? 'rgba(34,192,122,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
              <input
                type="checkbox"
                checked={signoffConfirmed}
                onChange={e => {
                  setSignoffConfirmed(e.target.checked)
                  saveFormField('install_signoff_confirmed', e.target.checked)
                }}
                style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: signoffConfirmed ? 'var(--green)' : 'var(--text1)', marginBottom: 3 }}>Customer approves the completed installation</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>By checking this box, you confirm the customer has inspected and approved the quality of the vehicle wrap installation.</div>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Drop-off photo gallery (condensed view) */}
      <div style={cardStyle}>
        <SectionHeader icon={<Camera size={12} style={{ color: 'var(--accent)' }} />} title="Install Photos" open={openSections.photos} onToggle={() => toggleSection('photos')} />
        {openSections.photos && (
          <div style={{ padding: '0 16px 16px' }}>
            <JobPhotosTab projectId={projectId} orgId={orgId} currentUserId={profile.id} />
          </div>
        )}
      </div>

      {/* Time Tracking */}
      <div style={cardStyle}>
        <SectionHeader icon={<Timer size={12} style={{ color: 'var(--green)' }} />} title={`Install Timer${timerSaved ? ' ✓' : timerElapsed > 0 ? ` — ${formatTime(timerElapsed)}` : ''}`} open={openSections.timer} onToggle={() => toggleSection('timer')} />
        {openSections.timer && (
          <div style={{ padding: '0 16px 16px' }}>
            {/* Film acceptance */}
            {!timerSaved && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={12} style={{ color: 'var(--amber)' }} /> Material Inspection
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, background: filmAccepted ? 'rgba(34,192,122,0.06)' : 'var(--surface2)', border: `1px solid ${filmAccepted ? 'rgba(34,192,122,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                  <input type="checkbox" checked={filmAccepted} onChange={e => { setFilmAccepted(e.target.checked); saveFormField('film_accepted', e.target.checked) }} style={{ width: 15, height: 15, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: filmAccepted ? 'var(--green)' : 'var(--text1)', marginBottom: 2 }}>I have inspected the vinyl & laminate — I accept the film as-is and am ready to install</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Check for any defects, correct color, and verify material matches the job order before starting.</div>
                  </div>
                </label>
              </div>
            )}

            {/* Timer display */}
            {!timerSaved && (
              <div style={{ textAlign: 'center', padding: '20px 16px', background: 'var(--surface2)', borderRadius: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: timerRunning ? 'var(--green)' : 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', marginBottom: 12 }}>
                  {formatTime(timerElapsed)}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {!timerRunning && timerElapsed === 0 && (
                    <button onClick={startTimer} disabled={!filmAccepted} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, border: 'none', background: filmAccepted ? 'var(--green)' : 'var(--surface2)', color: filmAccepted ? '#fff' : 'var(--text3)', cursor: filmAccepted ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                      <Play size={14} /> Start Install Timer
                    </button>
                  )}
                  {timerRunning && (
                    <button onClick={pauseTimer} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--amber)', color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      <Pause size={14} /> Pause
                    </button>
                  )}
                  {!timerRunning && timerElapsed > 0 && (
                    <button onClick={resumeTimer} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      <Play size={14} /> Resume
                    </button>
                  )}
                </div>
                {!filmAccepted && timerElapsed === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>Accept film inspection above to start the timer</div>
                )}
              </div>
            )}

            {/* Post-install checklist (shows when timer has started) */}
            {timerElapsed > 0 && !timerSaved && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>Post-Install Checklist ({postInstallDone}/{POST_INSTALL.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {POST_INSTALL.map(item => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', borderRadius: 7, background: postInstallChecklist[item.key] ? 'rgba(34,192,122,0.06)' : 'var(--surface2)' }}>
                      <input type="checkbox" checked={!!postInstallChecklist[item.key]} onChange={() => {
                        const next = { ...postInstallChecklist, [item.key]: !postInstallChecklist[item.key] }
                        setPostInstallChecklist(next)
                        saveFormField('post_install_checklist', next)
                      }} style={{ width: 15, height: 15, accentColor: 'var(--green)', cursor: 'pointer' }} />
                      <span style={{ fontSize: 12, color: postInstallChecklist[item.key] ? 'var(--green)' : 'var(--text2)' }}>{item.label}</span>
                    </label>
                  ))}
                </div>

                {/* Upload reminder */}
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', fontSize: 11, color: 'var(--accent)' }}>
                  Upload post-install photos in the "Install Photos" section, then submit below to stop the timer.
                </div>

                {/* Submit button */}
                <button
                  onClick={submitTimer}
                  disabled={!canSubmit}
                  style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: canSubmit ? 'var(--green)' : 'var(--surface2)', color: canSubmit ? '#fff' : 'var(--text3)', cursor: canSubmit ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}
                >
                  <StopCircle size={14} /> Submit & Stop Timer{!canSubmit && ` (${POST_INSTALL.length - postInstallDone} items remaining)`}
                </button>
              </div>
            )}

            {timerSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 8, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.3)' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Install session complete — {formatTime(timerElapsed)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Time saved to install_sessions</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Installer Chat */}
      <div style={cardStyle}>
        <SectionHeader icon={<MessageSquare size={12} style={{ color: 'var(--amber)' }} />} title="Installer Chat" open={openSections.chat} onToggle={() => toggleSection('chat')} />
        {openSections.chat && (
          <div style={{ height: 420 }}>
            <JobChat
              projectId={projectId}
              orgId={orgId}
              currentUserId={profile.id}
              currentUserName={profile.name || ''}
              customerName={customerName}
              installerName={installerName}
              defaultChannel="threeway"
            />
          </div>
        )}
      </div>
    </div>
  )
}
