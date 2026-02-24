'use client'

import { Pencil, ArrowRight, Type, CircleDot, Square, ThumbsUp, RefreshCw, HelpCircle, Undo2, Trash2 } from 'lucide-react'
import type { AnnotationTool } from '@/lib/proof-types'
import { ANNOTATION_COLORS } from '@/lib/proof-types'
import type { LucideIcon } from 'lucide-react'

interface Props {
  activeTool: AnnotationTool
  activeColor: string
  annotationCount: number
  onToolChange: (tool: AnnotationTool) => void
  onColorChange: (color: string) => void
  onUndo: () => void
  onClearAll: () => void
}

const tools: { key: AnnotationTool; icon: LucideIcon; label: string }[] = [
  { key: 'draw', icon: Pencil, label: 'Draw' },
  { key: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { key: 'text', icon: Type, label: 'Text' },
  { key: 'circle', icon: CircleDot, label: 'Circle' },
  { key: 'rect', icon: Square, label: 'Rectangle' },
]

const stamps: { key: string; icon: LucideIcon; label: string; stamp: string }[] = [
  { key: 'stamp-thumbsUp', icon: ThumbsUp, label: 'Like', stamp: 'thumbsUp' },
  { key: 'stamp-refresh', icon: RefreshCw, label: 'Redo', stamp: 'refresh' },
  { key: 'stamp-help', icon: HelpCircle, label: 'Question', stamp: 'help' },
]

export default function AnnotationToolbar({
  activeTool, activeColor, annotationCount,
  onToolChange, onColorChange, onUndo, onClearAll,
}: Props) {
  return (
    <div style={{
      background: '#13151c',
      borderRadius: 12,
      border: '1px solid rgba(79,127,255,0.15)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Tool buttons */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
        {tools.map(t => {
          const Icon = t.icon
          const isActive = activeTool === t.key
          return (
            <button
              key={t.key}
              onClick={() => onToolChange(t.key)}
              title={t.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 10px',
                borderRadius: 8,
                border: isActive ? '1px solid #4f7fff' : '1px solid transparent',
                background: isActive ? 'rgba(79,127,255,0.15)' : 'transparent',
                color: isActive ? '#4f7fff' : '#9299b5',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
        {stamps.map(s => {
          const Icon = s.icon
          const isActive = activeTool === 'stamp' && activeColor === s.stamp
          return (
            <button
              key={s.key}
              onClick={() => {
                onToolChange('stamp')
                // Encode stamp type via a special mechanism
                onColorChange(s.stamp)
              }}
              title={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 10px',
                borderRadius: 8,
                border: isActive ? '1px solid #22d3ee' : '1px solid transparent',
                background: isActive ? 'rgba(34,211,238,0.1)' : 'transparent',
                color: isActive ? '#22d3ee' : '#9299b5',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Icon size={14} />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Color picker + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {ANNOTATION_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => onColorChange(c.value)}
              title={c.label}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c.value,
                border: activeColor === c.value ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
                boxShadow: activeColor === c.value ? '0 0 0 2px #4f7fff' : 'none',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {annotationCount > 0 && (
            <span style={{
              padding: '2px 8px',
              borderRadius: 12,
              background: 'rgba(79,127,255,0.15)',
              color: '#4f7fff',
              fontSize: 11,
              fontWeight: 700,
            }}>
              {annotationCount}
            </span>
          )}
          <button
            onClick={onUndo}
            title="Undo"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: '#9299b5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={onClearAll}
            title="Clear All"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid rgba(242,90,90,0.3)',
              color: '#f25a5a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
