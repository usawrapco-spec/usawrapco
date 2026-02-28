'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'

interface AlertDrillDownProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footerContent?: React.ReactNode
}

export default function AlertDrillDown({ open, onClose, title, children, footerContent }: AlertDrillDownProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(560px, 100vw)',
        background: 'var(--surface)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: 'var(--surface)',
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
            letterSpacing: '0.04em', margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0, background: 'var(--surface)',
          }}>
            {footerContent}
          </div>
        )}
      </div>
    </>
  )
}
