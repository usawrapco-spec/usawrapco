'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Calendar,
  Clock,
  Settings,
  Check,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'

interface BookingSettings {
  id?: string
  org_id: string
  booking_enabled: boolean
  advance_booking_days: number
  min_notice_hours: number
  slot_duration_minutes: number
  buffer_minutes: number
  max_daily_bookings: number
  available_days: string[]
  hours_start: string
  hours_end: string
  appointment_types: string[]
  confirmation_email: boolean
  reminder_email: boolean
  reminder_hours_before: number
  booking_page_title: string
  booking_page_message: string | null
}

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DEFAULT_TYPES = ['estimate', 'install', 'consultation', 'drop-off']
const BUFFER_OPTIONS = [0, 15, 30, 45, 60]
const SLOT_OPTIONS = [30, 45, 60, 90, 120]
const NOTICE_OPTIONS = [1, 2, 4, 8, 24, 48, 72]
const ADVANCE_OPTIONS = [7, 14, 30, 60, 90]
const REMINDER_OPTIONS = [1, 2, 4, 8, 24, 48, 72]
const MAX_DAILY_OPTIONS = [2, 4, 6, 8, 10, 12, 15, 20]

interface Props {
  profile: Profile
  initialSettings: Record<string, unknown> | null
  orgId: string
}

const DEFAULT_SETTINGS: BookingSettings = {
  org_id: '',
  booking_enabled: true,
  advance_booking_days: 30,
  min_notice_hours: 24,
  slot_duration_minutes: 60,
  buffer_minutes: 15,
  max_daily_bookings: 8,
  available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  hours_start: '08:00',
  hours_end: '17:00',
  appointment_types: ['estimate', 'install', 'consultation'],
  confirmation_email: true,
  reminder_email: true,
  reminder_hours_before: 24,
  booking_page_title: 'Book an Appointment',
  booking_page_message: null,
}

function parseSettings(raw: Record<string, unknown> | null, orgId: string): BookingSettings {
  if (!raw) return { ...DEFAULT_SETTINGS, org_id: orgId }
  const startRaw = typeof raw.hours_start === 'string' ? raw.hours_start : '08:00:00'
  const endRaw = typeof raw.hours_end === 'string' ? raw.hours_end : '17:00:00'
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    org_id: orgId,
    booking_enabled: raw.booking_enabled !== false,
    advance_booking_days: typeof raw.advance_booking_days === 'number' ? raw.advance_booking_days : 30,
    min_notice_hours: typeof raw.min_notice_hours === 'number' ? raw.min_notice_hours : 24,
    slot_duration_minutes: typeof raw.slot_duration_minutes === 'number' ? raw.slot_duration_minutes : 60,
    buffer_minutes: typeof raw.buffer_minutes === 'number' ? raw.buffer_minutes : 15,
    max_daily_bookings: typeof raw.max_daily_bookings === 'number' ? raw.max_daily_bookings : 8,
    available_days: Array.isArray(raw.available_days) ? (raw.available_days as string[]) : DEFAULT_SETTINGS.available_days,
    hours_start: startRaw.slice(0, 5),
    hours_end: endRaw.slice(0, 5),
    appointment_types: Array.isArray(raw.appointment_types) ? (raw.appointment_types as string[]) : DEFAULT_SETTINGS.appointment_types,
    confirmation_email: raw.confirmation_email !== false,
    reminder_email: raw.reminder_email !== false,
    reminder_hours_before: typeof raw.reminder_hours_before === 'number' ? raw.reminder_hours_before : 24,
    booking_page_title: typeof raw.booking_page_title === 'string' ? raw.booking_page_title : 'Book an Appointment',
    booking_page_message: typeof raw.booking_page_message === 'string' ? raw.booking_page_message : null,
  }
}

export default function BookingSettingsClient({ initialSettings, orgId }: Props) {
  const [supabase] = useState(() => createClient())
  const [form, setForm] = useState<BookingSettings>(() => parseSettings(initialSettings, orgId))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day],
    }))
  }

  const toggleType = (type: string) => {
    setForm(prev => ({
      ...prev,
      appointment_types: prev.appointment_types.includes(type)
        ? prev.appointment_types.filter(t => t !== type)
        : [...prev.appointment_types, type],
    }))
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    setSaved(false)
    const payload = { ...form, org_id: orgId, booking_page_message: form.booking_page_message || null }
    let err
    if (form.id) {
      const res = await supabase.from('booking_settings').update(payload).eq('id', form.id)
      err = res.error
    } else {
      const res = await supabase.from('booking_settings').insert(payload)
      err = res.error
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text1)', fontSize: 13,
  }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
  const toggle = (active: boolean, onClick: () => void, label: string, desc: string) => (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{desc}</div>
      </div>
      <button
        onClick={onClick}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: active ? 'var(--green)' : 'var(--surface2)',
          border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        }}
        aria-label={label}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: active ? 23 : 3,
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/settings" style={{ color: 'var(--text3)', display: 'flex' }}>
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Booking Settings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            Configure your public booking page and appointment availability
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Link
          href="/book"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--accent)', fontSize: 12, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={13} /> Preview Booking Page
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Enable / disable */}
        <section style={{ background: 'var(--surface)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={14} style={{ color: 'var(--accent)' }} /> Booking Status
          </h3>
          {toggle(
            form.booking_enabled,
            () => setForm(p => ({ ...p, booking_enabled: !p.booking_enabled })),
            form.booking_enabled ? 'Booking is ENABLED' : 'Booking is DISABLED',
            'Allow customers to book appointments via /book',
          )}
        </section>

        {/* Availability */}
        <section style={{ background: 'var(--surface)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} style={{ color: 'var(--accent)' }} /> Availability
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Days */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Days</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ALL_DAYS.map(day => {
                  const active = form.available_days.includes(day)
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: active ? 'rgba(79,127,255,0.15)' : 'var(--bg)',
                        color: active ? 'var(--accent)' : 'var(--text3)',
                        border: active ? '1px solid rgba(79,127,255,0.3)' : '1px solid var(--border)',
                        cursor: 'pointer', textTransform: 'capitalize',
                      }}
                    >{day.slice(0, 3)}</button>
                  )
                })}
              </div>
            </div>
            {/* Hours */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Time</label>
                <input type="time" value={form.hours_start} onChange={e => setForm(p => ({ ...p, hours_start: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Close Time</label>
                <input type="time" value={form.hours_end} onChange={e => setForm(p => ({ ...p, hours_end: e.target.value }))} style={inp} />
              </div>
            </div>
            {/* Slot/buffer/advance/max */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Slot Duration</label>
                <select value={form.slot_duration_minutes} onChange={e => setForm(p => ({ ...p, slot_duration_minutes: Number(e.target.value) }))} style={sel}>
                  {SLOT_OPTIONS.map(v => <option key={v} value={v}>{v} min</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buffer Between Appts</label>
                <select value={form.buffer_minutes} onChange={e => setForm(p => ({ ...p, buffer_minutes: Number(e.target.value) }))} style={sel}>
                  {BUFFER_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? 'None' : `${v} min`}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Minimum Notice</label>
                <select value={form.min_notice_hours} onChange={e => setForm(p => ({ ...p, min_notice_hours: Number(e.target.value) }))} style={sel}>
                  {NOTICE_OPTIONS.map(v => <option key={v} value={v}>{v < 24 ? `${v}h` : `${v / 24}d`}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Book Up To</label>
                <select value={form.advance_booking_days} onChange={e => setForm(p => ({ ...p, advance_booking_days: Number(e.target.value) }))} style={sel}>
                  {ADVANCE_OPTIONS.map(v => <option key={v} value={v}>{v} days out</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max Per Day</label>
                <select value={form.max_daily_bookings} onChange={e => setForm(p => ({ ...p, max_daily_bookings: Number(e.target.value) }))} style={sel}>
                  {MAX_DAILY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Appointment types */}
        <section style={{ background: 'var(--surface)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} style={{ color: 'var(--accent)' }} /> Appointment Types
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DEFAULT_TYPES.map(type => {
              const active = form.appointment_types.includes(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: active ? 'rgba(79,127,255,0.15)' : 'var(--bg)',
                    color: active ? 'var(--accent)' : 'var(--text3)',
                    border: active ? '1px solid rgba(79,127,255,0.3)' : '1px solid var(--border)',
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >{type}</button>
              )
            })}
          </div>
        </section>

        {/* Notifications */}
        <section style={{ background: 'var(--surface)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: '0 0 16px' }}>Notifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {toggle(
              form.confirmation_email,
              () => setForm(p => ({ ...p, confirmation_email: !p.confirmation_email })),
              'Confirmation Email',
              'Send email when booking is made',
            )}
            {toggle(
              form.reminder_email,
              () => setForm(p => ({ ...p, reminder_email: !p.reminder_email })),
              'Reminder Email',
              'Send reminder before appointment',
            )}
            {form.reminder_email && (
              <div style={{ paddingLeft: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Send Reminder</label>
                <select value={form.reminder_hours_before} onChange={e => setForm(p => ({ ...p, reminder_hours_before: Number(e.target.value) }))} style={{ ...sel, maxWidth: 200 }}>
                  {REMINDER_OPTIONS.map(v => <option key={v} value={v}>{v < 24 ? `${v} hours before` : `${v / 24} day before`}</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Page content */}
        <section style={{ background: 'var(--surface)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: '0 0 16px' }}>Booking Page Content</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Page Title</label>
              <input value={form.booking_page_title} onChange={e => setForm(p => ({ ...p, booking_page_title: e.target.value }))} placeholder="Book an Appointment" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Welcome Message (optional)</label>
              <textarea
                value={form.booking_page_message || ''}
                onChange={e => setForm(p => ({ ...p, booking_page_message: e.target.value || null }))}
                placeholder="Add a custom message shown at the top of your booking page..."
                rows={3}
                style={{ ...inp, resize: 'vertical' as const }}
              />
            </div>
          </div>
        </section>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(242,90,90,0.1)', color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--green)' }}>
              <Check size={14} /> Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              fontSize: 14, fontWeight: 700, border: 'none',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
