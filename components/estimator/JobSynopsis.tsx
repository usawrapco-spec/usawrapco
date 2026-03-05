'use client'

import type { LineItemState, LineItemCalc } from '@/lib/estimator/types'
import { PRODUCT_TYPE_LABELS } from '@/lib/estimator/vehicleDb'
import { Car, Palette, Wrench, FileText } from 'lucide-react'

export interface SynopsisData {
  client?: string
  vehicle?: string
  vehicleColor?: string
  wrapDetail?: string
  jobType?: string
  notes?: string
}

interface JobSynopsisProps {
  items: (LineItemState & { _calc?: LineItemCalc })[]
  synopsis?: SynopsisData
}

const COVERAGE_LABELS: Record<string, string> = {
  full: 'Full Wrap',
  threequarter: '3/4 Wrap',
  half: 'Half Wrap',
}

export default function JobSynopsis({ items, synopsis }: JobSynopsisProps) {
  const nonOptional = items.filter(i => !i.isOptional)
  const hasProjectInfo = synopsis && (synopsis.vehicle || synopsis.wrapDetail || synopsis.notes)
  if (nonOptional.length === 0 && !hasProjectInfo) return null

  const uniqueTypes = [...new Set(nonOptional.map(i => i.type))]

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        fontSize: 11, fontWeight: 800, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        <FileText size={14} />
        Job Synopsis
      </div>

      {/* Project-level info */}
      {synopsis && (synopsis.vehicle || synopsis.wrapDetail || synopsis.vehicleColor) && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12,
          padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)',
        }}>
          {synopsis.vehicle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                {synopsis.vehicle}
              </span>
              {synopsis.vehicleColor && (
                <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>
                  — {synopsis.vehicleColor}
                </span>
              )}
            </div>
          )}
          {(synopsis.wrapDetail || synopsis.jobType) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {synopsis.jobType && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                    background: 'rgba(79,127,255,0.12)', color: 'var(--accent)',
                    fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase',
                  }}>
                    {synopsis.jobType}
                  </span>
                )}
                {synopsis.wrapDetail && (
                  <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>
                    {synopsis.wrapDetail}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {synopsis?.notes && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          borderLeft: '3px solid var(--accent)', background: 'rgba(79,127,255,0.04)',
          fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
        }}>
          {synopsis.notes}
        </div>
      )}

      {/* Per-item summary rows */}
      {nonOptional.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nonOptional.map((item, i) => {
            const vehicleStr = [item.year, item.make, item.model].filter(Boolean).join(' ')
            const coverageLabel = COVERAGE_LABELS[item.coverage || ''] || ''
            const typeLabel = PRODUCT_TYPE_LABELS[item.type] || item.type

            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 6,
                background: 'var(--surface2)',
              }}>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                  background: 'rgba(79,127,255,0.12)', color: 'var(--accent)',
                  fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {typeLabel}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--text1)', fontWeight: 600 }}>
                  {item.name || `Item ${i + 1}`}
                  {vehicleStr && (
                    <span style={{ color: 'var(--text2)', fontWeight: 400, marginLeft: 6 }}>
                      {vehicleStr}
                    </span>
                  )}
                </span>
                {coverageLabel && (
                  <span style={{
                    fontSize: 9, color: 'var(--text3)', fontWeight: 600,
                    fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase',
                  }}>
                    {coverageLabel}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Aggregate footer */}
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text3)', fontWeight: 600,
        fontFamily: "'Barlow Condensed', sans-serif",
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {nonOptional.length} item{nonOptional.length !== 1 ? 's' : ''}
        {uniqueTypes.length > 0 && (
          <>
            {' \u00B7 '}
            {uniqueTypes.map(t => PRODUCT_TYPE_LABELS[t] || t).join(', ')}
          </>
        )}
        {items.some(i => i.isOptional) && (
          <span style={{ marginLeft: 8, color: 'var(--amber)' }}>
            +{items.filter(i => i.isOptional).length} optional
          </span>
        )}
      </div>
    </div>
  )
}
