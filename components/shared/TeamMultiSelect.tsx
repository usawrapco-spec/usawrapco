'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, User } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  role: string
  avatar_url?: string | null
}

interface Props {
  label: string
  members: TeamMember[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  canWrite: boolean
  accentColor?: string
}

export default function TeamMultiSelect({ label, members, selectedIds, onChange, canWrite, accentColor = '#4f7fff' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = members.filter(m => selectedIds.includes(m.id))
  const available = members.filter(m => !selectedIds.includes(m.id))

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div ref={ref} style={{ marginBottom: 10, position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div
        onClick={() => canWrite && setOpen(!open)}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
          padding: '4px 8px', minHeight: 32, borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg-secondary)',
          cursor: canWrite ? 'pointer' : 'default',
        }}
      >
        {selected.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>None assigned</span>
        )}
        {selected.map(m => (
          <span key={m.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 6px 2px 4px', borderRadius: 6,
            background: `${accentColor}18`, color: accentColor,
            fontSize: 11, fontWeight: 600,
          }}>
            <User size={10} />
            {m.name?.split(' ')[0]}
            {canWrite && (
              <X size={10} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={e => { e.stopPropagation(); toggle(m.id) }} />
            )}
          </span>
        ))}
        {canWrite && <ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />}
      </div>

      {open && available.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: 180, overflowY: 'auto',
        }}>
          {available.map(m => (
            <div
              key={m.id}
              onClick={() => toggle(m.id)}
              style={{
                padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <User size={12} style={{ color: accentColor }} />
              <span>{m.name}</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{m.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
