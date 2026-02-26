'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, ScanBarcode, MapPin, Navigation, Sparkles } from 'lucide-react'
import type { Profile } from '@/types'
import FleetStatsCards from './_components/FleetStatsCards'
import VehiclesPanel from './_components/VehiclesPanel'
import VINScanner from './_components/VINScanner'
import MileageTracker from './_components/MileageTracker'
import RouteHistory from './_components/RouteHistory'
import AIAgents from './_components/AIAgents'

interface Props {
  profile: Profile
  initialVehicles: any[]
  initialTrips: any[]
  customers: any[]
  drivers: any[]
}

const TABS = [
  { id: 'vehicles', label: 'Vehicles', icon: Truck },
  { id: 'vin', label: 'VIN Scanner', icon: ScanBarcode },
  { id: 'mileage', label: 'Mileage Tracker', icon: MapPin },
  { id: 'routes', label: 'Route History', icon: Navigation },
  { id: 'agents', label: 'AI Agents', icon: Sparkles },
] as const

type TabId = typeof TABS[number]['id']

export default function FleetHubClient({ profile, initialVehicles, initialTrips, customers, drivers }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('vehicles')
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [trips, setTrips] = useState(initialTrips)

  const refresh = useCallback(() => { router.refresh() }, [router])

  // Calculate trip miles per vehicle
  const tripMiles = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of trips) {
      const vid = t.vehicle_id || t.vehicle?.id
      if (vid) map[vid] = (map[vid] || 0) + Number(t.miles || 0)
    }
    return map
  }, [trips])

  // Stats
  const fleetSize = vehicles.length
  const totalMiles = trips.reduce((s: number, t: any) => s + Number(t.miles || 0), 0)
  const wrappedCount = vehicles.filter((v: any) => v.wrap_status === 'wrapped').length
  const unwrappedCount = vehicles.filter((v: any) => v.wrap_status === 'none').length

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif', margin: 0,
          }}>
            Fleet Hub
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            Vehicle fleet management, VIN scanning, mileage tracking
          </p>
        </div>
      </div>

      {/* Stats */}
      <FleetStatsCards
        fleetSize={fleetSize}
        totalMiles={totalMiles}
        wrappedCount={wrappedCount}
        unwrappedCount={unwrappedCount}
      />

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '1px solid var(--border)', paddingBottom: 0,
        overflowX: 'auto',
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                background: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
                marginBottom: -1,
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'vehicles' && (
        <VehiclesPanel vehicles={vehicles} customers={customers} tripMiles={tripMiles} onRefresh={refresh} />
      )}
      {tab === 'vin' && (
        <VINScanner customers={customers} onRefresh={refresh} />
      )}
      {tab === 'mileage' && (
        <MileageTracker vehicles={vehicles} drivers={drivers} trips={trips} onRefresh={refresh} />
      )}
      {tab === 'routes' && (
        <RouteHistory trips={trips} />
      )}
      {tab === 'agents' && (
        <AIAgents compact />
      )}
    </div>
  )
}
