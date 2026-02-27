'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  MoreVertical, Copy, ArrowUpRight, ArrowRight, User, Wrench,
  Calendar, FileText, Send, MessageSquare, StickyNote, AlertTriangle,
  Archive, ChevronRight, X, Loader2, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

interface JobContextMenuProps {
  project: Project
  size?: number
  onAction?: (action: string) => void
}

const PIPE_STAGES = [
  { key: 'sales_in', label: 'Sales' },
  { key: 'production', label: 'Production' },
  { key: 'install', label: 'Install' },
  { key: 'prod_review', label: 'QC Review' },
  { key: 'sales_close', label: 'Close' },
  { key: 'done', label: 'Done' },
]

const headingFont = 'Barlow Condensed, sans-serif'

export default function JobContextMenu({ project, size = 28, onAction }: JobContextMenuProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [subMenu, setSubMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [installers, setInstallers] = useState<any[]>([])
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load agents/installers on open
  useEffect(() => {
    if (!open) return
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('role', ['sales_agent', 'admin', 'owner', 'installer', 'production'])
        .order('name')
      if (data) {
        setAgents(data.filter(p => ['sales_agent', 'admin', 'owner'].includes(p.role)))
        setInstallers(data.filter(p => p.role === 'installer'))
      }
    }
    load()
  }, [open, supabase])

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!btnRef.current) return

    const rect = btnRef.current.getBoundingClientRect()
    const menuH = 420
    const menuW = 220
    const top = rect.bottom + menuH > window.innerHeight
      ? Math.max(8, rect.top - menuH)
      : rect.bottom + 4
    const left = rect.left + menuW > window.innerWidth
      ? rect.right - menuW
      : rect.left

    setPos({ top, left })
    setOpen(!open)
    setSubMenu(null)
  }

  const close = () => {
    setOpen(false)
    setPos(null)
    setSubMenu(null)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  const duplicateJob = async () => {
    setLoading('duplicate')
    const fd = (project.form_data as any) || {}
    const { data } = await supabase.from('projects').insert({
      org_id: project.org_id,
      title: `Copy of ${project.title || 'Untitled'}`,
      status: 'estimate',
      pipe_stage: 'sales_in',
      type: project.type,
      revenue: project.revenue,
      vehicle_desc: project.vehicle_desc,
      form_data: { ...fd, client: `Copy of ${fd.client || fd.clientName || project.title || ''}` },
      agent_id: project.agent_id,
    }).select('id').single()
    setLoading(null)
    close()
    if (data?.id) router.push(`/projects/${data.id}`)
    onAction?.('duplicate')
  }

  const changeStage = async (stage: string) => {
    setLoading(stage)
    await supabase.from('projects').update({
      pipe_stage: stage, updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setLoading(null)
    close()
    onAction?.('stage_change')
  }

  const reassignAgent = async (agentId: string) => {
    setLoading(agentId)
    await supabase.from('projects').update({
      agent_id: agentId, updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setLoading(null)
    close()
    onAction?.('reassign_agent')
  }

  const reassignInstaller = async (installerId: string) => {
    setLoading(installerId)
    await supabase.from('projects').update({
      installer_id: installerId, updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setLoading(null)
    close()
    onAction?.('reassign_installer')
  }

  const archiveJob = async () => {
    setLoading('archive')
    await supabase.from('projects').update({
      status: 'cancelled', updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setLoading(null)
    close()
    onAction?.('archive')
  }

  const flagForReview = async () => {
    setLoading('flag')
    const fd = (project.form_data as any) || {}
    await supabase.from('projects').update({
      form_data: { ...fd, flagged: true, flaggedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setLoading(null)
    close()
    onAction?.('flag')
  }

  const menuItems: Array<{
    id: string; icon: React.ElementType; label: string
    danger?: boolean; divider?: boolean; sub?: boolean
    onClick?: () => void
  }> = [
    { id: 'duplicate', icon: Copy, label: 'Duplicate Job', onClick: duplicateJob },
    { id: 'stage', icon: ArrowRight, label: 'Change Stage', sub: true, divider: true },
    { id: 'agent', icon: User, label: 'Reassign Agent', sub: true },
    { id: 'installer', icon: Wrench, label: 'Reassign Installer', sub: true },
    { id: 'schedule', icon: Calendar, label: 'Schedule Install', divider: true, onClick: () => { close(); router.push(`/projects/${project.id}?tab=install`) } },
    { id: 'invoice', icon: FileText, label: 'Create Invoice', onClick: () => { close(); router.push(`/invoices?from=${project.id}`) } },
    { id: 'estimate', icon: Send, label: 'Send Estimate', onClick: () => { close(); router.push(`/estimates?from=${project.id}`) } },
    { id: 'message', icon: MessageSquare, label: 'Message Customer', divider: true, onClick: () => { close(); router.push(project.customer_id ? `/inbox?customerId=${project.customer_id}` : '/inbox') } },
    { id: 'note', icon: StickyNote, label: 'Add Internal Note', onClick: () => { close(); router.push(`/projects/${project.id}?tab=chat`) } },
    { id: 'flag', icon: AlertTriangle, label: 'Flag for Review', divider: true, onClick: flagForReview },
    { id: 'archive', icon: Archive, label: 'Archive Job', danger: true, onClick: archiveJob },
  ]

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          width: size, height: size, borderRadius: 6, flexShrink: 0,
          background: open ? 'rgba(79,127,255,0.12)' : 'transparent',
          border: open ? '1px solid var(--accent)' : '1px solid transparent',
          color: open ? 'var(--accent)' : 'var(--text3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.12s', padding: 0,
        }}
      >
        <MoreVertical size={size * 0.57} />
      </button>

      {/* Portal menu */}
      {open && pos && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 9990 }} />

          {/* Menu */}
          <div
            ref={menuRef}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
              width: 220, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              animation: 'fadeUp 120ms ease-out',
            }}
          >
            {menuItems.map((item) => (
              <div key={item.id}>
                {item.divider && <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.sub) { setSubMenu(subMenu === item.id ? null : item.id) }
                    else item.onClick?.()
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', border: 'none', background: subMenu === item.id ? 'var(--surface2)' : 'transparent',
                    color: item.danger ? 'var(--red)' : 'var(--text2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 80ms ease',
                  }}
                  onMouseEnter={e => { if (!item.sub || subMenu !== item.id) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { if (subMenu !== item.id) e.currentTarget.style.background = 'transparent' }}
                >
                  {loading === item.id
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    : <item.icon size={14} style={{ flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {item.sub && <ChevronRight size={12} style={{ color: 'var(--text3)', transform: subMenu === item.id ? 'rotate(90deg)' : 'none', transition: 'transform 100ms' }} />}
                </button>

                {/* Submenu: Change Stage */}
                {item.id === 'stage' && subMenu === 'stage' && (
                  <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    {PIPE_STAGES.map(s => (
                      <button
                        key={s.key}
                        onClick={(e) => { e.stopPropagation(); changeStage(s.key) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px 7px 28px', border: 'none', background: 'transparent',
                          color: project.pipe_stage === s.key ? 'var(--accent)' : 'var(--text2)',
                          fontSize: 11, fontWeight: project.pipe_stage === s.key ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {loading === s.key
                          ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : project.pipe_stage === s.key
                            ? <Check size={12} style={{ color: 'var(--accent)' }} />
                            : <ArrowRight size={12} />
                        }
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Submenu: Reassign Agent */}
                {item.id === 'agent' && subMenu === 'agent' && (
                  <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                    {agents.length === 0 && (
                      <div style={{ padding: '8px 28px', fontSize: 11, color: 'var(--text3)' }}>No agents found</div>
                    )}
                    {agents.map(a => (
                      <button
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); reassignAgent(a.id) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px 7px 28px', border: 'none', background: 'transparent',
                          color: project.agent_id === a.id ? 'var(--accent)' : 'var(--text2)',
                          fontSize: 11, fontWeight: project.agent_id === a.id ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {loading === a.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <User size={12} />}
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Submenu: Reassign Installer */}
                {item.id === 'installer' && subMenu === 'installer' && (
                  <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                    {installers.length === 0 && (
                      <div style={{ padding: '8px 28px', fontSize: 11, color: 'var(--text3)' }}>No installers found</div>
                    )}
                    {installers.map(inst => (
                      <button
                        key={inst.id}
                        onClick={(e) => { e.stopPropagation(); reassignInstaller(inst.id) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px 7px 28px', border: 'none', background: 'transparent',
                          color: project.installer_id === inst.id ? 'var(--accent)' : 'var(--text2)',
                          fontSize: 11, fontWeight: project.installer_id === inst.id ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {loading === inst.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Wrench size={12} />}
                        {inst.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>,
        document.body,
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
