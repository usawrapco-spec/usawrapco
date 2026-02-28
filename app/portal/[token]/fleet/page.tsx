'use client'

import { usePortal } from '@/lib/portal-context'
import { C } from '@/lib/portal-theme'
import { calcImpressions, fmtImpressions } from '@/lib/fleet-map/calculations'
import { useEffect, useState } from 'react'
import { Map, Gauge, Wrench, Navigation, MapPin } from 'lucide-react'

interface FleetVehicle {
  id: string
  name: string | null
  plate: string | null
  fleet_status: string | null
  today_miles: number | null
  mileage: number | null
  wrap_sqft: number | null
  wrap_description: string | null
  vehicle_emoji: string | null
  accent_color: string | null
  next_service_date: string | null
}

const STATUS_COLOR: Record<string, string> = {
  moving: '#22c07a',
  active: '#22c07a',
  parked: '#9299b5',
  maintenance: '#f59e0b',
  inactive: '#5a6080',
}
const STATUS_LABEL: Record<string, string> = {
  moving: 'MOVING',
  active: 'ACTIVE',
  parked: 'PARKED',
  maintenance: 'SERVICE',
  inactive: 'OFFLINE',
}

export default function PortalFleetPage() {
  const { customer } = usePortal()
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/fleet-map/vehicles`)
        if (res.ok) {
          const all: FleetVehicle[] = await res.json()
          // Filter to customer's vehicles
          setVehicles(all.filter(v => v.name !== null))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customer.id])

  const totalImpressions = vehicles.reduce((s, v) => s + calcImpressions(v.today_miles ?? 0, v.wrap_sqft ?? 300), 0)

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: C.text3, paddingTop: 60 }}>
        Loading fleet data…
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', paddingTop: 60 }}>
        <Map size={32} color={C.text3} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: C.text2 }}>No fleet vehicles linked to your account</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>Contact us to set up fleet tracking</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Map size={18} color="#00D4FF" />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Fleet Tracker</h1>
        </div>
        <div style={{ fontSize: 12, color: C.text3 }}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} tracked</div>
      </div>

      {/* Total impressions counter */}
      <div style={{
        background: 'rgba(139,92,246,0.1)',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>TODAY&rsquo;S TOTAL IMPRESSIONS</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#8b5cf6', fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>
          {fmtImpressions(totalImpressions)}
        </div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>across all wrapped vehicles</div>
      </div>

      {/* Vehicle list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vehicles.map(v => {
          const statusColor = STATUS_COLOR[v.fleet_status ?? 'inactive'] ?? '#5a6080'
          const impressions = calcImpressions(v.today_miles ?? 0, v.wrap_sqft ?? 300)
          const today = new Date().toISOString().split('T')[0]
          const serviceOverdue = v.next_service_date && v.next_service_date < today

          return (
            <div
              key={v.id}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 2, background: `linear-gradient(90deg, ${v.accent_color ?? '#00D4FF'}, transparent)` }} />
              <div style={{ padding: '12px 14px' }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{v.vehicle_emoji ?? '🚐'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: C.text3 }}>{v.plate ?? '—'}</div>
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
                    background: statusColor + '20', color: statusColor, letterSpacing: '0.06em',
                  }}>
                    {STATUS_LABEL[v.fleet_status ?? 'inactive'] ?? '—'}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    { label: 'Mi Today', value: (v.today_miles ?? 0).toString() },
                    { label: 'Odometer', value: ((v.mileage ?? 0) / 1000).toFixed(0) + 'k' },
                    { label: 'Impressions', value: fmtImpressions(impressions) },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.surface2, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: C.text3, marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Wrap description */}
                {v.wrap_description && (
                  <div style={{ fontSize: 11, color: C.text2, marginBottom: 6 }}>{v.wrap_description}</div>
                )}

                {/* Status line */}
                {serviceOverdue ? (
                  <div style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Wrench size={11} />Service scheduled: {v.next_service_date}
                  </div>
                ) : v.fleet_status === 'moving' ? (
                  <div style={{ fontSize: 11, color: '#00D4FF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Navigation size={11} />Currently en route
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: C.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} />Parked
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Log miles CTA */}
      <div style={{ marginTop: 20 }}>
        <button
          style={{
            width: '100%', padding: '13px', borderRadius: 10,
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)',
            color: '#22c07a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Gauge size={15} />Log Mileage
        </button>
      </div>

      {/* Route history placeholder */}
      <div style={{
        marginTop: 16, background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Route History</div>
        <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: '12px 0' }}>
          Route history coming soon
        </div>
      </div>
    </div>
  )
}
