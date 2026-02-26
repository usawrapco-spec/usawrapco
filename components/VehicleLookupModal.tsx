'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Ruler, Printer, Car } from 'lucide-react'
import { VehicleMeasurementPicker, type MeasurementResult } from '@/components/VehicleMeasurementPicker'

const headingFont = "'Barlow Condensed', sans-serif"

interface Props {
  open: boolean
  onClose: () => void
  onSelect?: (measurement: MeasurementResult) => void
}

export default function VehicleLookupModal({ open, onClose, onSelect }: Props) {
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleMeasurementFound = useCallback((m: MeasurementResult) => {
    setMeasurement(m)
  }, [])

  const handleSelect = useCallback(() => {
    if (measurement && onSelect) {
      onSelect(measurement)
      onClose()
    }
  }, [measurement, onSelect, onClose])

  const handlePrint = useCallback(() => {
    if (!measurement) return
    const printWindow = window.open('', '_blank', 'width=500,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Vehicle Measurements</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
        h2 { margin: 0 0 4px; }
        .sub { color: #888; font-size: 13px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 6px 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
        td:last-child { text-align: right; font-weight: bold; font-family: monospace; }
        .note { font-size: 11px; color: #999; margin-top: 12px; }
        .dims { font-size: 12px; color: #666; margin-top: 8px; font-family: monospace; }
      </style></head><body>
      <h2>${measurement.make} ${measurement.model}</h2>
      <div class="sub">${measurement.year_start}${measurement.year_end !== measurement.year_start ? '&ndash;' + measurement.year_end : ''} | ${measurement.body_style || 'N/A'}</div>
      <table>
        <tr><td>Full Wrap</td><td>${measurement.full_wrap_sqft} sq ft</td></tr>
        <tr><td>Partial (Sides)</td><td>${measurement.partial_wrap_sqft} sq ft</td></tr>
        <tr><td>Each Side</td><td>${measurement.side_sqft} sq ft</td></tr>
        <tr><td>Hood</td><td>${measurement.hood_sqft} sq ft</td></tr>
        <tr><td>Roof</td><td>${measurement.roof_sqft ?? '--'} sq ft</td></tr>
        <tr><td>Rear</td><td>${measurement.back_sqft} sq ft</td></tr>
        <tr><td>Trunk/Tailgate</td><td>${measurement.trunk_sqft} sq ft</td></tr>
        <tr><td>Doors</td><td>${measurement.doors_sqft} sq ft</td></tr>
      </table>
      <div class="dims">Side: ${measurement.side_width}"W x ${measurement.side_height}"H</div>
      <div class="note">* All measurements include 6" total bleed</div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [measurement])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 520, maxWidth: '95vw', maxHeight: '90vh',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Car size={16} style={{ color: 'var(--accent)' }} />
            <span style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text1)',
              fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Vehicle Measurement Lookup
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
          <VehicleMeasurementPicker
            onMeasurementFound={handleMeasurementFound}
            showDetailedBreakdown={true}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          {measurement && (
            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              <Printer size={13} /> Print
            </button>
          )}
          {onSelect && measurement && (
            <button
              onClick={handleSelect}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--accent)', color: '#fff', border: 'none',
                cursor: 'pointer',
              }}
            >
              <Ruler size={13} /> Use These Measurements
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
