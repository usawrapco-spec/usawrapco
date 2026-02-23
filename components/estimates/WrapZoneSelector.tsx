'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { Layers, Check, RotateCcw } from 'lucide-react'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// ─── Zone Definitions ───────────────────────────────────────────────────────────

interface ZoneDef {
  id: string
  label: string
  pct: number // percentage of total vehicle sqft
}

const ZONES: ZoneDef[] = [
  { id: 'hood',            label: 'Hood',            pct: 8   },
  { id: 'roof',            label: 'Roof',            pct: 10  },
  { id: 'trunk_tailgate',  label: 'Trunk/Tailgate',  pct: 7   },
  { id: 'driver_side',     label: 'Driver Side',     pct: 18  },
  { id: 'passenger_side',  label: 'Passenger Side',  pct: 18  },
  { id: 'rear_bumper',     label: 'Rear Bumper',     pct: 5   },
  { id: 'front_bumper',    label: 'Front Bumper',    pct: 5   },
  { id: 'side_mirrors',    label: 'Side Mirrors',    pct: 1   },
  { id: 'pillars',         label: 'Pillars',         pct: 3   },
  { id: 'door_handles',    label: 'Door Handles',    pct: 0.5 },
]

const ALL_ZONE_IDS = ZONES.map(z => z.id)
const FULL_WRAP_PCT = 100

const WASTE_OPTIONS = [5, 10, 15, 20]

// ─── Props ──────────────────────────────────────────────────────────────────────

interface WrapZoneSelectorProps {
  specs: Record<string, unknown>
  updateSpec: (key: string, value: unknown) => void
  canWrite: boolean
  vehicleSqft: number
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function WrapZoneSelector({
  specs,
  updateSpec,
  canWrite,
  vehicleSqft,
}: WrapZoneSelectorProps) {
  const selectedZones: string[] = useMemo(() => {
    const raw = specs.selectedZones
    return Array.isArray(raw) ? raw : []
  }, [specs.selectedZones])

  const wastePercent: number = useMemo(() => {
    const raw = specs.wastePercent
    return typeof raw === 'number' ? raw : 10
  }, [specs.wastePercent])

  // ─── Derived values ─────────────────────────────────────────────────────────

  const allIndividualSelected = useMemo(
    () => ALL_ZONE_IDS.every(id => selectedZones.includes(id)),
    [selectedZones],
  )

  const isFullWrap = allIndividualSelected

  const netSqft = useMemo(() => {
    if (isFullWrap) {
      return Math.round(vehicleSqft * (FULL_WRAP_PCT / 100))
    }
    const totalPct = ZONES.reduce((sum, z) => {
      return selectedZones.includes(z.id) ? sum + z.pct : sum
    }, 0)
    return Math.round(vehicleSqft * (totalPct / 100))
  }, [selectedZones, vehicleSqft, isFullWrap])

  const wasteSqft = Math.round(netSqft * (wastePercent / 100))
  const totalToOrder = netSqft + wasteSqft

  const coverageLabel = useMemo(() => {
    if (selectedZones.length === 0) return 'No Zones Selected'
    if (isFullWrap) return 'Full Wrap'
    if (selectedZones.length === 1) {
      const zone = ZONES.find(z => z.id === selectedZones[0])
      if (zone) return `${zone.label} Wrap`
    }
    return `Partial Wrap (${selectedZones.length} zones)`
  }, [selectedZones, isFullWrap])

  // ─── Sync vinylArea whenever zones or waste changes ─────────────────────────

  useEffect(() => {
    if (specs.vinylArea !== totalToOrder) {
      updateSpec('vinylArea', totalToOrder)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalToOrder])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const toggleZone = useCallback(
    (zoneId: string) => {
      if (!canWrite) return
      const next = selectedZones.includes(zoneId)
        ? selectedZones.filter(id => id !== zoneId)
        : [...selectedZones, zoneId]
      updateSpec('selectedZones', next)
    },
    [selectedZones, canWrite, updateSpec],
  )

  const toggleFullWrap = useCallback(() => {
    if (!canWrite) return
    if (allIndividualSelected) {
      updateSpec('selectedZones', [])
    } else {
      updateSpec('selectedZones', [...ALL_ZONE_IDS])
    }
  }, [allIndividualSelected, canWrite, updateSpec])

  const clearAll = useCallback(() => {
    if (!canWrite) return
    updateSpec('selectedZones', [])
  }, [canWrite, updateSpec])

  const setWaste = useCallback(
    (pct: number) => {
      if (!canWrite) return
      updateSpec('wastePercent', pct)
    },
    [canWrite, updateSpec],
  )

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
    fontFamily: headingFont,
  }

  const zoneBtn = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 8,
    border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
    background: selected ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
    cursor: canWrite ? 'pointer' : 'default',
    opacity: canWrite ? 1 : 0.6,
    transition: 'all 0.15s ease',
    width: '100%',
    textAlign: 'left' as const,
    outline: 'none',
  })

  const fullWrapBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 10,
    border: active ? '2px solid var(--green)' : '1px solid var(--border)',
    background: active ? 'rgba(34,192,122,0.10)' : 'var(--surface)',
    cursor: canWrite ? 'pointer' : 'default',
    opacity: canWrite ? 1 : 0.6,
    transition: 'all 0.15s ease',
    width: '100%',
    fontFamily: headingFont,
    fontWeight: 900,
    fontSize: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: active ? 'var(--green)' : 'var(--text2)',
    outline: 'none',
  })

  const wasteChip = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: monoFont,
    border: active ? '2px solid var(--cyan)' : '1px solid var(--border)',
    background: active ? 'rgba(34,211,238,0.08)' : 'var(--surface)',
    color: active ? 'var(--cyan)' : 'var(--text3)',
    cursor: canWrite ? 'pointer' : 'default',
    opacity: canWrite ? 1 : 0.6,
    transition: 'all 0.15s ease',
    outline: 'none',
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={15} style={{ color: 'var(--accent)' }} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              fontFamily: headingFont,
              color: 'var(--text1)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Wrap Coverage Zones
          </span>
        </div>
        {selectedZones.length > 0 && canWrite && (
          <button
            onClick={clearAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(242,90,90,0.08)',
              border: '1px solid rgba(242,90,90,0.25)',
              color: 'var(--red)',
              fontFamily: headingFont,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              outline: 'none',
            }}
          >
            <RotateCcw size={10} />
            Clear All
          </button>
        )}
      </div>

      {/* Vehicle sqft context */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
          Vehicle Total
        </span>
        <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>
          {vehicleSqft} sqft
        </span>
      </div>

      {/* Full Wrap toggle */}
      <button onClick={toggleFullWrap} style={fullWrapBtn(isFullWrap)}>
        {isFullWrap && <Check size={16} />}
        Full Wrap (Select All)
      </button>

      {/* Individual zone grid */}
      <div style={labelStyle}>Individual Zones</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
        className="wrap-zone-grid"
      >
        {ZONES.map(zone => {
          const selected = selectedZones.includes(zone.id)
          const zoneSqft = Math.round(vehicleSqft * (zone.pct / 100))
          return (
            <button key={zone.id} onClick={() => toggleZone(zone.id)} style={zoneBtn(selected)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: selected ? 'var(--accent)' : 'var(--text1)',
                    fontFamily: headingFont,
                    letterSpacing: '0.02em',
                  }}
                >
                  {zone.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text3)',
                    fontFamily: monoFont,
                  }}
                >
                  {zone.pct}% &middot; {zoneSqft} sqft
                </span>
              </div>
              {selected && (
                <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Coverage type badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: isFullWrap ? 'rgba(34,192,122,0.08)' : 'rgba(79,127,255,0.06)',
          borderRadius: 8,
          border: `1px solid ${isFullWrap ? 'rgba(34,192,122,0.25)' : 'rgba(79,127,255,0.2)'}`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: headingFont,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text3)',
          }}
        >
          Coverage
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            fontFamily: headingFont,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isFullWrap ? 'var(--green)' : selectedZones.length > 0 ? 'var(--accent)' : 'var(--text3)',
          }}
        >
          {coverageLabel}
        </span>
      </div>

      {/* Waste buffer selector */}
      <div>
        <div style={labelStyle}>Waste Buffer</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {WASTE_OPTIONS.map(pct => (
            <button key={pct} onClick={() => setWaste(pct)} style={wasteChip(wastePercent === pct)}>
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Running total breakdown */}
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Net Sqft</span>
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text1)',
            }}
          >
            {netSqft} sqft
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>
            + {wastePercent}% Waste Buffer
          </span>
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--amber)',
            }}
          >
            {wasteSqft} sqft
          </span>
        </div>
        <div
          style={{
            borderTop: '2px solid var(--border)',
            paddingTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text1)',
              fontFamily: headingFont,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Total to Order
          </span>
          <span
            style={{
              fontFamily: monoFont,
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--green)',
            }}
          >
            {totalToOrder} sqft
          </span>
        </div>
      </div>

      {/* Responsive style for 4-col on desktop */}
      <style>{`
        @media (min-width: 640px) {
          .wrap-zone-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
