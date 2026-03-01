'use client'

import { useState } from 'react'
import { Anchor, Phone, Wifi, Droplets, Wrench, Car, ShowerHead, Toilet, Fuel, Filter, BadgeCheck } from 'lucide-react'

interface Marina {
  id: string
  name: string
  region: string | null
  city: string | null
  state: string | null
  address: string | null
  phone: string | null
  vhf_channel: string | null
  has_launch_ramp: boolean | null
  has_fuel_dock: boolean | null
  fuel_types: string[] | null
  has_pump_out: boolean | null
  has_transient_moorage: boolean | null
  transient_rate_per_ft_per_night: number | null
  has_repair_yard: boolean | null
  has_wifi: boolean | null
  has_showers: boolean | null
  has_restrooms: boolean | null
  has_rv_parking: boolean | null
  usa_wrapco_authorized: boolean | null
  notes: string | null
}

interface Props {
  marinas: Marina[]
}

interface AmenityBadgeProps {
  active: boolean | null
  icon: React.ReactNode
  label: string
  detail?: string | null
  color?: string
}

function AmenityBadge({ active, icon, label, detail, color = 'var(--green)' }: AmenityBadgeProps) {
  if (!active) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: `${color}14`,
      border: `1px solid ${color}44`,
      borderRadius: 5,
      padding: '3px 8px',
      fontSize: 11,
      color,
      whiteSpace: 'nowrap',
    }}>
      {icon}
      {label}
      {detail && <span style={{ opacity: 0.8 }}>({detail})</span>}
    </span>
  )
}

export function MarinasClient({ marinas }: Props) {
  const [filterRegion, setFilterRegion] = useState('')
  const [filterLaunchRamp, setFilterLaunchRamp] = useState(false)
  const [filterFuelDock, setFilterFuelDock] = useState(false)

  const regions = [...new Set(marinas.map(m => m.region).filter((r): r is string => r !== null))]

  const filtered = marinas.filter(m => {
    if (filterRegion && m.region !== filterRegion) return false
    if (filterLaunchRamp && !m.has_launch_ramp) return false
    if (filterFuelDock && !m.has_fuel_dock) return false
    return true
  })

  const iStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid #2a2d3e',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Anchor size={24} color="var(--cyan)" />
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Marinas
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{marinas.length} marinas</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} color="var(--text2)" />
        <div>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={iStyle}>
            <option value="">All regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text1)' }}>
          <input
            type="checkbox"
            checked={filterLaunchRamp}
            onChange={e => setFilterLaunchRamp(e.target.checked)}
          />
          Launch ramp
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text1)' }}>
          <input
            type="checkbox"
            checked={filterFuelDock}
            onChange={e => setFilterFuelDock(e.target.checked)}
          />
          Fuel dock
        </label>
        <button
          onClick={() => { setFilterRegion(''); setFilterLaunchRamp(false); setFilterFuelDock(false) }}
          style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '6px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
        >
          Clear
        </button>
        <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>{filtered.length} results</span>
      </div>

      {/* Marina Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <Anchor size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p>No marinas match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(marina => {
            const fuelTypes = Array.isArray(marina.fuel_types) ? marina.fuel_types : []

            return (
              <div
                key={marina.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '18px 20px' }}
              >
                {/* Name & badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 17, margin: 0 }}>{marina.name}</h3>
                      {marina.usa_wrapco_authorized && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(79,127,255,0.15)', border: '1px solid var(--accent)', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                          <BadgeCheck size={11} /> USA WrapCo Authorized
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {marina.region && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{marina.region}</span>}
                      {(marina.city || marina.state) && (
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {[marina.city, marina.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {marina.phone && (
                      <a
                        href={`tel:${marina.phone}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        <Phone size={13} /> {marina.phone}
                      </a>
                    )}
                    {marina.vhf_channel && (
                      <span style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                        VHF {marina.vhf_channel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Address */}
                {marina.address && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 10px' }}>{marina.address}</p>
                )}

                {/* Amenity badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <AmenityBadge active={marina.has_launch_ramp} icon={<Anchor size={10} />} label="Launch Ramp" color="var(--cyan)" />
                  <AmenityBadge
                    active={marina.has_fuel_dock}
                    icon={<Fuel size={10} />}
                    label="Fuel"
                    detail={fuelTypes.length > 0 ? fuelTypes.join(', ') : null}
                    color="var(--amber)"
                  />
                  <AmenityBadge active={marina.has_pump_out} icon={<Droplets size={10} />} label="Pump-Out" color="var(--accent)" />
                  <AmenityBadge
                    active={marina.has_transient_moorage}
                    icon={<Anchor size={10} />}
                    label="Transient"
                    detail={marina.transient_rate_per_ft_per_night != null ? `$${marina.transient_rate_per_ft_per_night}/ft/night` : null}
                    color="var(--green)"
                  />
                  <AmenityBadge active={marina.has_repair_yard} icon={<Wrench size={10} />} label="Repair Yard" color="var(--purple)" />
                  <AmenityBadge active={marina.has_wifi} icon={<Wifi size={10} />} label="WiFi" color="var(--cyan)" />
                  <AmenityBadge active={marina.has_showers} icon={<ShowerHead size={10} />} label="Showers" color="var(--green)" />
                  <AmenityBadge active={marina.has_restrooms} icon={<Toilet size={10} />} label="Restrooms" color="var(--green)" />
                  <AmenityBadge active={marina.has_rv_parking} icon={<Car size={10} />} label="RV Parking" color="var(--text2)" />
                </div>

                {marina.notes && (
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '10px 0 0', lineHeight: 1.5 }}>{marina.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
