'use client'

import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  MessageSquare,
  Truck,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

const APPOINTMENT_TYPES = [
  { key: 'Estimate', label: 'Estimate', desc: 'Get a quote for your vehicle wrap', icon: FileText },
  { key: 'Consultation', label: 'Consultation', desc: 'Discuss your project in detail', icon: MessageSquare },
  { key: 'Install Drop-off', label: 'Install Drop-off', desc: 'Drop off your vehicle for installation', icon: Truck },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const MAX_FUTURE_MONTHS = 3

export default function BookingPageClient() {
  const [step, setStep] = useState(1)
  const [appointmentType, setAppointmentType] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', vehicleType: '', serviceInterest: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [slotsError, setSlotsError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const submittingRef = useRef(false)

  // Fetch slots when date selected
  useEffect(() => {
    if (!selectedDate) return
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoadingSlots(true)
    setSlots([])
    setSelectedTime('')
    setSlotsError('')
    fetch(`/api/booking/slots?org_id=${ORG_ID}&date=${selectedDate}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('server')
        return r.json()
      })
      .then(data => {
        if (!data) return
        setSlots(data.slots || [])
        if (data.slots?.length === 0) setSlotsError('')
        setLoadingSlots(false)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setSlotsError('Unable to load available times. Please try again.')
        setSlots([])
        setLoadingSlots(false)
      })

    return () => controller.abort()
  }, [selectedDate])

  const handleBook = async () => {
    if (submittingRef.current) return
    if (!form.name || !form.email) return
    if (!isValidEmail(form.email)) { setEmailError('Please enter a valid email address'); return }
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: ORG_ID,
          appointment_type: appointmentType,
          date: selectedDate,
          time: selectedTime,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          company: form.company,
          vehicle_type: form.vehicleType,
          service_interest: form.serviceInterest,
          notes: form.notes,
        }),
      })
      if (!res.ok) {
        let msg = 'Booking failed'
        try { const d = await res.json(); if (d?.error) msg = d.error } catch { /* not JSON */ }
        throw new Error(msg)
      }
      setBooked(true)
      setStep(5)
    } catch (err: any) {
      if (err instanceof TypeError) {
        setError('Online booking is temporarily unavailable. Please call us at (253) 353-0440.')
      } else {
        setError(err?.message || 'Something went wrong. Please call us at (253) 353-0440.')
      }
    }
    setSubmitting(false)
    submittingRef.current = false
  }

  const today = formatDate(new Date())

  // Calendar bounds
  const now = new Date()
  const isAtMinMonth = calYear === now.getFullYear() && calMonth === now.getMonth()
  const maxDate = new Date(now.getFullYear(), now.getMonth() + MAX_FUTURE_MONTHS, 1)
  const isAtMaxMonth = calYear === maxDate.getFullYear() && calMonth === maxDate.getMonth()

  // Calendar for step 2
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calYear, calMonth)
    const firstDay = getFirstDayOfMonth(calYear, calMonth)
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button
            onClick={() => { if (!isAtMinMonth) { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) } }}
            disabled={isAtMinMonth}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', cursor: isAtMinMonth ? 'not-allowed' : 'pointer', color: '#9299b5', display: 'flex', opacity: isAtMinMonth ? 0.3 : 1 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>
            {MONTHS[calMonth]} {calYear}
          </span>
          <button
            onClick={() => { if (!isAtMaxMonth) { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) } }}
            disabled={isAtMaxMonth}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', cursor: isAtMaxMonth ? 'not-allowed' : 'pointer', color: '#9299b5', display: 'flex', opacity: isAtMaxMonth ? 0.3 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: 6, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#5a6080' }}>
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isPast = dateStr < today
            const isSunday = new Date(calYear, calMonth, day).getDay() === 0
            const isSelected = dateStr === selectedDate
            const disabled = isPast || isSunday

            return (
              <button
                key={dateStr}
                disabled={disabled}
                onClick={() => { setSelectedDate(dateStr); setStep(3) }}
                style={{
                  padding: '10px 4px',
                  borderRadius: 8,
                  border: isSelected ? '2px solid #4f7fff' : '1px solid transparent',
                  background: isSelected ? 'rgba(79,127,255,0.15)' : 'transparent',
                  color: disabled ? '#5a6080' : isSelected ? '#4f7fff' : '#e8eaed',
                  fontSize: 14,
                  fontWeight: isSelected ? 800 : 500,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const formatTimeDisplay = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0f14',
      color: '#e8eaed',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        padding: '24px 20px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <img
          src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp"
          alt="USA Wrap Co"
          style={{ height: 52, margin: '0 auto 12px', display: 'block', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://usawrapco.com/wp-content/uploads/2025/10/cropped-main_logo-removebg-preview.png'
          }}
        />
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          fontFamily: 'Barlow Condensed, sans-serif',
          margin: 0,
          color: '#e8eaed',
        }}>
          Book an Appointment
        </h1>
        <p style={{ fontSize: 14, color: '#9299b5', marginTop: 6 }}>
          Schedule your vehicle wrap consultation or drop-off
        </p>
        <p style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>
          All times are Pacific Time (PT)
        </p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 0', justifyContent: 'center' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{
            width: 40, height: 4, borderRadius: 2,
            background: step >= s ? '#4f7fff' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 520, padding: '24px 20px 60px' }}>

        {/* Step 1: Select Type */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 16, color: '#e8eaed' }}>
              What would you like to schedule?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {APPOINTMENT_TYPES.map(t => {
                const Icon = t.icon
                const selected = appointmentType === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => { setAppointmentType(t.key); setStep(2) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px', borderRadius: 10,
                      background: selected ? 'rgba(79,127,255,0.12)' : 'rgba(255,255,255,0.03)',
                      border: selected ? '1px solid rgba(79,127,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.15s',
                      color: '#e8eaed',
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: selected ? 'rgba(79,127,255,0.2)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={20} style={{ color: selected ? '#4f7fff' : '#9299b5' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: '#9299b5', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Pick a Date */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 12, padding: 0 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 16, color: '#e8eaed' }}>
              Pick a Date
            </h2>
            {renderCalendar()}
          </div>
        )}

        {/* Step 3: Pick a Time */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 12, padding: 0 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4, color: '#e8eaed' }}>
              Pick a Time
            </h2>
            <p style={{ fontSize: 13, color: '#9299b5', marginBottom: 16 }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Loader2 size={24} style={{ color: '#4f7fff', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 13, color: '#9299b5', marginTop: 8 }}>Loading available times...</p>
              </div>
            ) : slotsError ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#f25a5a' }}>
                <Clock size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>{slotsError}</p>
                <button onClick={() => setStep(2)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Choose another date
                </button>
              </div>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9299b5' }}>
                <Clock size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>No available times for this date</p>
                <button onClick={() => setStep(2)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Choose another date
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {slots.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSelectedTime(s); setStep(4) }}
                    style={{
                      padding: '12px 8px', borderRadius: 8,
                      background: selectedTime === s ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.03)',
                      border: selectedTime === s ? '1px solid rgba(79,127,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: selectedTime === s ? '#4f7fff' : '#e8eaed',
                      fontSize: 14, fontWeight: 600,
                      fontFamily: 'JetBrains Mono, monospace',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {formatTimeDisplay(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Your Info */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 12, padding: 0 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4, color: '#e8eaed' }}>
              Your Information
            </h2>
            <p style={{ fontSize: 13, color: '#9299b5', marginBottom: 20 }}>
              {appointmentType} on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTimeDisplay(selectedTime)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <User size={13} /> Full Name *
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="John Smith"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <Mail size={13} /> Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setEmailError('') }}
                  onBlur={() => { if (form.email && !isValidEmail(form.email)) setEmailError('Please enter a valid email address') }}
                  placeholder="john@example.com"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: emailError ? '1px solid rgba(242,90,90,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14,
                  }}
                />
                {emailError && (
                  <div style={{ fontSize: 11, color: '#f25a5a', marginTop: 4 }}>{emailError}</div>
                )}
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <Phone size={13} /> Phone
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <User size={13} /> Company (optional)
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  placeholder="Your company name"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <Truck size={13} /> Vehicle Type
                </label>
                <input
                  type="text"
                  value={form.vehicleType}
                  onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}
                  placeholder="e.g. 2024 Ford F-150"
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <FileText size={13} /> Service Interested In
                </label>
                <select
                  value={form.serviceInterest}
                  onChange={e => setForm(p => ({ ...p, serviceInterest: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14,
                  }}
                >
                  <option value="" style={{ background: '#13151c' }}>Select a service...</option>
                  <option value="full_wrap" style={{ background: '#13151c' }}>Full Vehicle Wrap</option>
                  <option value="partial_wrap" style={{ background: '#13151c' }}>Partial Wrap</option>
                  <option value="color_change" style={{ background: '#13151c' }}>Color Change</option>
                  <option value="commercial" style={{ background: '#13151c' }}>Commercial / Fleet</option>
                  <option value="ppf" style={{ background: '#13151c' }}>Paint Protection Film</option>
                  <option value="decking" style={{ background: '#13151c' }}>Decking (DekWave)</option>
                  <option value="marine" style={{ background: '#13151c' }}>Marine Wrap</option>
                  <option value="other" style={{ background: '#13151c' }}>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9299b5', marginBottom: 6 }}>
                  <FileText size={13} /> Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any additional details..."
                  rows={3}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e8eaed', fontSize: 14, resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', color: '#f25a5a', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={submitting || !form.name || !form.email}
              style={{
                width: '100%', marginTop: 20,
                padding: '14px 20px', borderRadius: 10,
                background: '#4f7fff', color: '#fff',
                fontSize: 15, fontWeight: 700, border: 'none',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: !form.name || !form.email ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Booking...
                </>
              ) : (
                <>
                  <CalendarIcon size={16} />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,192,122,0.15)', margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={32} style={{ color: '#22c07a' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: '#e8eaed', margin: '0 0 8px' }}>
              Booking Confirmed!
            </h2>
            <p style={{ fontSize: 14, color: '#9299b5', marginBottom: 28 }}>
              We&apos;ll send a confirmation to your email.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 12,
              padding: 20, border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Type</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{appointmentType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Date</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Time</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{formatTimeDisplay(selectedTime)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Name</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{form.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Email</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{form.email}</span>
                </div>
                {form.phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#9299b5' }}>Phone</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{form.phone}</span>
                  </div>
                )}
                {form.notes && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#9299b5' }}>Notes</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed', textAlign: 'right', maxWidth: '60%' }}>{form.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setStep(1)
                setAppointmentType('')
                setSelectedDate('')
                setSelectedTime('')
                setForm({ name: '', email: '', phone: '', company: '', vehicleType: '', serviceInterest: '', notes: '' })
                setBooked(false)
                setCalMonth(new Date().getMonth())
                setCalYear(new Date().getFullYear())
              }}
              style={{
                marginTop: 20, padding: '10px 20px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', color: '#9299b5',
                fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              Book Another Appointment
            </button>
          </div>
        )}
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
