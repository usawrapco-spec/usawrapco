'use client'

import { usePortal } from '@/lib/portal-context'
import { C, fmt } from '@/lib/portal-theme'
import { Calendar, Car } from 'lucide-react'

interface Appointment {
  id: string
  title: string
  vehicle_desc: string | null
  install_date: string
  pipe_stage: string
  type: string | null
}

interface Props {
  appointments: Appointment[]
  customerId: string
}

export default function PortalSchedule({ appointments, customerId }: Props) {
  const { token } = usePortal()

  const upcoming = appointments.filter(a => new Date(a.install_date) >= new Date())
  const past = appointments.filter(a => new Date(a.install_date) < new Date())

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        Schedule
      </h1>

      {appointments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <Calendar size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No scheduled appointments</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Your install dates will appear here</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Upcoming ({upcoming.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} upcoming />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Past ({past.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </div>
        </section>
      )}

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginTop: 28,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Need to reschedule?</div>
        <div style={{ fontSize: 12, color: C.text2 }}>
          Send us a message and we will work with you to find a new time.
        </div>
      </div>
    </div>
  )
}

function AppointmentCard({ appointment, upcoming }: { appointment: Appointment; upcoming?: boolean }) {
  const dateObj = new Date(appointment.install_date)
  const dayNum = dateObj.getDate()
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' })
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${upcoming ? C.accent + '40' : C.border}`,
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      gap: 14,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 10,
        background: upcoming ? `${C.accent}18` : C.surface2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: upcoming ? C.accent : C.text3, textTransform: 'uppercase' }}>
          {month}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: upcoming ? C.accent : C.text2, fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>
          {dayNum}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{appointment.title}</div>
        {appointment.vehicle_desc && (
          <div style={{ fontSize: 12, color: C.text2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Car size={12} /> {appointment.vehicle_desc}
          </div>
        )}
        <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
          {dayName}, {fmt(appointment.install_date)}
        </div>
      </div>
    </div>
  )
}
