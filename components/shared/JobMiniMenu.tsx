'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Copy, ChevronRight, Link2, CreditCard, Eye, MessageCircle,
  Archive, Trash2, MoreHorizontal,
} from 'lucide-react'

const STAGES = [
  { key: 'sales_in', label: 'Sales Intake', color: '#4f7fff' },
  { key: 'production', label: 'Production', color: '#22c07a' },
  { key: 'install', label: 'Install', color: '#22d3ee' },
  { key: 'prod_review', label: 'QC Review', color: '#f59e0b' },
  { key: 'sales_close', label: 'Sales Close', color: '#8b5cf6' },
]

export interface JobMiniMenuProps {
  projectId: string
  projectTitle: string
  currentStage: string
  customerId?: string
  onAction?: (action: string, data?: any) => void
  position?: 'left' | 'right'
}

export default function JobMiniMenu({
  projectId,
  projectTitle,
  currentStage,
  customerId,
  onAction,
  position = 'right',
}: JobMiniMenuProps) {
  const [open, setOpen] = useState(false)
  const [stageSubmenu, setStageSubmenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [submenuPos, setSubmenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuW = 200
    let left = position === 'right'
      ? Math.min(rect.right - menuW, window.innerWidth - menuW - 8)
      : rect.left
    left = Math.max(8, left)
    const top = Math.min(rect.bottom + 4, window.innerHeight - 300)
    setMenuPos({ top, left })
    setStageSubmenu(false)
    setOpen(true)
  }, [position])

  // Close on outside click or ESC
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function handleMoveStage(stage: string) {
    setOpen(false)
    try {
      await supabase
        .from('projects')
        .update({ pipe_stage: stage, updated_at: new Date().toISOString() })
        .eq('id', projectId)
      onAction?.('stage_changed', { stage })
    } catch (err) {
      console.error('Move stage error:', err)
    }
  }

  async function handleCopy() {
    setOpen(false)
    try {
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      if (!proj) return
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = proj
      await supabase.from('projects').insert({
        ...rest,
        title: `Copy of ${proj.title || 'Job'}`,
        pipe_stage: 'sales_in',
        status: 'estimate',
      })
      onAction?.('copied')
    } catch (err) {
      console.error('Copy job error:', err)
    }
  }

  async function handleArchive() {
    setOpen(false)
    if (!confirm(`Archive "${projectTitle}"? It will be hidden from the pipeline.`)) return
    try {
      await supabase.from('projects').update({ status: 'cancelled' }).eq('id', projectId)
      onAction?.('archived')
    } catch (err) {
      console.error('Archive error:', err)
    }
  }

  async function handleDelete() {
    setOpen(false)
    if (!confirm(`Permanently delete "${projectTitle}"? This cannot be undone.`)) return
    try {
      await supabase.from('projects').delete().eq('id', projectId)
      onAction?.('deleted')
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  type DividerItem = { divider: true }
  type ActionItem = {
    icon: React.ElementType
    label: string
    color: string
    hasSubmenu?: boolean
    action: (e: React.MouseEvent) => void
    danger?: boolean
  }

  const menuItems: (DividerItem | ActionItem)[] = [
    {
      icon: Copy,
      label: 'Copy Job',
      color: 'var(--text2)',
      action: () => handleCopy(),
    },
    {
      icon: ChevronRight,
      label: 'Move Stage',
      color: 'var(--accent)',
      hasSubmenu: true,
      action: (e: React.MouseEvent) => {
        e.stopPropagation()
        const el = e.currentTarget as HTMLElement
        const rect = el.getBoundingClientRect()
        setSubmenuPos({ top: rect.top, left: rect.right + 4 })
        setStageSubmenu(s => !s)
      },
    },
    {
      icon: Link2,
      label: 'Connect Job',
      color: 'var(--cyan)',
      action: () => { setOpen(false); onAction?.('connect') },
    },
    {
      icon: CreditCard,
      label: 'Add Transaction',
      color: 'var(--green)',
      action: () => { setOpen(false); router.push(`/projects/${projectId}?tab=close`) },
    },
    {
      icon: Eye,
      label: 'View Details',
      color: 'var(--text2)',
      action: () => { setOpen(false); router.push(`/projects/${projectId}`) },
    },
    {
      icon: MessageCircle,
      label: 'Message Customer',
      color: 'var(--purple)',
      action: () => { setOpen(false); router.push(`/inbox?customerId=${customerId || ''}`) },
    },
    { divider: true },
    {
      icon: Archive,
      label: 'Archive',
      color: 'var(--text3)',
      action: () => handleArchive(),
    },
    {
      icon: Trash2,
      label: 'Delete',
      color: 'var(--red)',
      action: () => handleDelete(),
      danger: true,
    },
  ]

  const menuItemStyle = (danger?: boolean, color?: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '8px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
    color: danger ? 'var(--red)' : color || 'var(--text2)',
    transition: 'background 0.12s',
    borderRadius: 6, margin: '1px 4px',
  })

  const menuContent = open ? ReactDOM.createPortal(
    <div
      ref={menuRef}
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        width: 200,
        background: 'var(--surface)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 99999,
        padding: '4px 0',
        animation: 'menuIn 0.12s ease',
      }}
    >
      {menuItems.map((item, idx) => {
        if ('divider' in item && item.divider) {
          return (
            <div
              key={`divider-${idx}`}
              style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }}
            />
          )
        }
        const mi = item as ActionItem
        return (
          <div
            key={mi.label}
            style={menuItemStyle(mi.danger, mi.color)}
            onClick={mi.action}
            onMouseEnter={e => {
              e.currentTarget.style.background = mi.danger
                ? 'rgba(242,90,90,0.12)'
                : 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <mi.icon size={13} />
            <span style={{ flex: 1 }}>{mi.label}</span>
            {mi.hasSubmenu && <ChevronRight size={11} style={{ opacity: 0.5 }} />}
          </div>
        )
      })}

      {/* Stage submenu */}
      {stageSubmenu && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: submenuPos.top,
            left: Math.min(submenuPos.left, window.innerWidth - 180),
            width: 170,
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 100000,
            padding: '4px 0',
          }}
        >
          {STAGES.map(stage => (
            <div
              key={stage.key}
              onClick={() => handleMoveStage(stage.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', cursor: 'pointer', fontSize: 12,
                fontWeight: stage.key === currentStage ? 700 : 500,
                color: stage.key === currentStage ? stage.color : 'var(--text2)',
                borderRadius: 6, margin: '1px 4px',
                background: stage.key === currentStage ? `${stage.color}12` : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => {
                if (stage.key !== currentStage) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                if (stage.key !== currentStage) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: stage.color, flexShrink: 0,
              }} />
              {stage.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        title="Job actions"
        style={{
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 6,
          padding: '3px 5px',
          cursor: 'pointer',
          color: 'var(--text3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'var(--text1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.color = 'var(--text3)'
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {menuContent}
    </>
  )
}
