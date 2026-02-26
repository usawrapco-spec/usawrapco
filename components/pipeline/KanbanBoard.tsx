'use client'

import { useState, useRef } from 'react'
import { Settings, CheckCircle, X } from 'lucide-react'
import PipelineJobCard, {
  CardFieldsContext,
  CardField,
  ALL_FIELDS,
  FIELD_LABELS,
  DEPT_DEFAULT_FIELDS,
} from '@/components/pipeline/PipelineJobCard'
import StageGateModal from '@/components/pipeline/StageGateModal'
import type { Profile } from '@/types'
import type { LucideIcon } from 'lucide-react'

export interface KanbanColumn {
  key: string
  label: string
  color: string
  icon: LucideIcon
  filterFn: (project: any) => boolean
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  projects: any[]
  department: 'sales' | 'production' | 'install'
  profileId: string
  orgId: string
  profile?: Profile
  horizontal?: boolean
  onProjectClick: (project: any) => void
  onStageChange?: (projectId: string, newStage: string) => void
  showGhosts?: boolean
  allProjects?: any[]
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getStoredFields(dept: string): CardField[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`pipeline_card_${dept}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveFields(dept: string, fields: CardField[]) {
  try { localStorage.setItem(`pipeline_card_${dept}`, JSON.stringify(fields)) } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KanbanBoard({
  columns,
  projects,
  department,
  profileId,
  orgId,
  profile,
  horizontal = false,
  onProjectClick,
  onStageChange,
  showGhosts = true,
  allProjects = [],
}: KanbanBoardProps) {
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [gateModal, setGateModal] = useState<{
    project: any; fromStage: string; toStage: string
  } | null>(null)
  const [showCustomize, setShowCustomize] = useState(false)
  const [visibleFields, setVisibleFields] = useState<CardField[]>(() => getStoredFields(department))

  // Drag tracking ref — prevents click-after-drag from navigating
  const draggingId = useRef<string | null>(null)

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId)
    draggingId.current = projectId
  }

  const handleDragEnd = () => {
    // Small delay so click fires after this clears
    setTimeout(() => { draggingId.current = null }, 80)
  }

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    setDragOver(columnKey)
  }

  const handleDrop = async (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    setDragOver(null)
    const projectId = e.dataTransfer.getData('projectId')
    if (!projectId || !onStageChange) return

    const proj = projects.find(p => p.id === projectId) || allProjects.find(p => p.id === projectId)
    const fromStage = proj?.pipe_stage || 'sales_in'

    if (profile && fromStage !== columnKey && isGateRequired(fromStage, columnKey)) {
      setGateModal({ project: proj, fromStage, toStage: columnKey })
    } else {
      onStageChange(projectId, columnKey)
    }
  }

  function handleGateConfirm() {
    if (gateModal && onStageChange) {
      onStageChange(gateModal.project.id, gateModal.toStage)
    }
    setGateModal(null)
  }

  // ── Card field customization ───────────────────────────────────────────────
  const effectiveFields = visibleFields.length > 0
    ? visibleFields
    : (DEPT_DEFAULT_FIELDS[department] || DEPT_DEFAULT_FIELDS.all)

  const toggleField = (field: CardField) => {
    const next = effectiveFields.includes(field)
      ? effectiveFields.filter(f => f !== field)
      : [...effectiveFields, field]
    setVisibleFields(next)
    saveFields(department, next)
  }

  const resetFields = () => {
    setVisibleFields([])
    try { localStorage.removeItem(`pipeline_card_${department}`) } catch {}
  }

  // ── Column data ────────────────────────────────────────────────────────────
  const columnData = columns.map(col => ({
    ...col,
    jobs: projects.filter(col.filterFn),
    ghostJobs: showGhosts
      ? allProjects.filter(p => !col.filterFn(p) && isGhostForDept(p, department, col.key))
      : [],
  }))

  return (
    <CardFieldsContext.Provider value={visibleFields}>
      {/* Root layout wrapper — fills parent height via flex */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Stage gate modal */}
      {gateModal && profile && (
        <StageGateModal
          isOpen={true}
          onClose={() => setGateModal(null)}
          project={gateModal.project}
          fromStage={gateModal.fromStage}
          toStage={gateModal.toStage}
          profile={profile}
          onConfirm={handleGateConfirm}
        />
      )}

      {/* Card customize panel */}
      {showCustomize && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 8990 }}
            onClick={() => setShowCustomize(false)}
          />
          <div style={{
            position: 'fixed', right: 16, top: 80, zIndex: 8999,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px',
            width: 260, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15,
                fontWeight: 900, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
                Customize Card
              </span>
              <button onClick={() => setShowCustomize(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 12 }}>
              Toggle fields shown on{' '}
              <strong style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{department}</strong> cards
            </div>

            {ALL_FIELDS.map(field => {
              const active = effectiveFields.includes(field)
              return (
                <button
                  key={field}
                  onClick={() => toggleField(field)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', marginBottom: 3, borderRadius: 7, cursor: 'pointer',
                    background: active ? 'rgba(79,127,255,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(79,127,255,0.25)' : 'transparent'}`,
                    color: active ? 'var(--accent)' : 'var(--text3)',
                    fontSize: 12, fontWeight: active ? 700 : 500, textAlign: 'left',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  {FIELD_LABELS[field]}
                  {active && <CheckCircle size={12} style={{ flexShrink: 0 }} />}
                </button>
              )
            })}

            <button
              onClick={resetFields}
              style={{
                marginTop: 10, fontSize: 10, color: 'var(--text3)',
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0',
              }}
            >
              Reset to {department} defaults
            </button>
          </div>
        </>
      )}

      {/* Board toolbar (customize button) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, flexShrink: 0 }}>
        <button
          onClick={() => setShowCustomize(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
            background: showCustomize ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
            border: `1px solid ${showCustomize ? 'var(--accent)' : 'var(--border)'}`,
            color: showCustomize ? 'var(--accent)' : 'var(--text3)',
            fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          <Settings size={12} />
          Customize Card
        </button>
      </div>

      {/* Columns — fills remaining height, scrolls horizontally, never vertically */}
      <div className="kanban-cols" style={{
        display: 'flex', flexDirection: 'row', gap: 12,
        overflowX: 'auto', overflowY: 'hidden',
        flex: 1, minHeight: 0,
      }}>
        {columnData.map(col => (
          <div
            key={col.key}
            className="kanban-col"
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, col.key)}
            style={{
              flex: '1 1 0',
              minWidth: 155,
              maxWidth: 260,
              background: dragOver === col.key ? `${col.color}08` : 'var(--surface)',
              border: `1px solid ${dragOver === col.key ? col.color : 'var(--border)'}`,
              borderRadius: 12, display: 'flex', flexDirection: 'column',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            {/* Column header — sticky at top, never scrolls */}
            <div style={{
              padding: '12px 14px',
              borderBottom: `2px solid ${col.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <col.icon size={14} color={col.color} />
                <span style={{
                  fontSize: 11, fontWeight: 900, color: col.color,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                }}>
                  {col.label}
                </span>
              </div>
              <span style={{
                background: `${col.color}20`, color: col.color,
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800,
              }}>
                {col.jobs.length}
              </span>
            </div>

            {/* Cards — scrollable within the column */}
            <div style={{
              padding: 8, flex: 1, minHeight: 0, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {col.jobs.length === 0 && col.ghostJobs.length === 0 && (
                <div style={{
                  padding: '24px 12px', textAlign: 'center',
                  color: 'var(--text3)', fontSize: 12, fontStyle: 'italic',
                }}>
                  No jobs
                </div>
              )}

              {/* Active jobs — draggable wrapper, no onClick here */}
              {col.jobs.map(project => (
                <div
                  key={project.id}
                  draggable
                  onDragStart={e => handleDragStart(e, project.id)}
                  onDragEnd={handleDragEnd}
                  style={{ borderRadius: 10 }}
                >
                  <PipelineJobCard
                    project={project}
                    department={department}
                    isGhost={false}
                    onClick={() => {
                      if (draggingId.current === project.id) return
                      onProjectClick(project)
                    }}
                    isDragging={() => draggingId.current === project.id}
                  />
                </div>
              ))}

              {/* Ghost cards */}
              {col.ghostJobs.map(project => (
                <PipelineJobCard
                  key={`ghost-${project.id}`}
                  project={project}
                  department={department}
                  isGhost={true}
                  onClick={() => onProjectClick(project)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      </div>{/* end root layout wrapper */}

      {/* Hide scrollbar on columns container; mobile snap scrolling */}
      <style>{`
        .kanban-cols::-webkit-scrollbar { display: none; }
        .kanban-cols { scrollbar-width: none; -ms-overflow-style: none; }
        @media (max-width: 767px) {
          .kanban-cols {
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }
          .kanban-col {
            flex: 0 0 85vw !important;
            min-width: 85vw !important;
            max-width: 85vw !important;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </CardFieldsContext.Provider>
  )
}

// ─── Stage gate logic ─────────────────────────────────────────────────────────

const GATED_TRANSITIONS = new Set([
  'sales_in→production',
  'production→install',
  'install→prod_review',
  'prod_review→sales_close',
  'sales_close→done',
])

function isGateRequired(fromStage: string, toStage: string): boolean {
  return GATED_TRANSITIONS.has(`${fromStage}→${toStage}`)
}

function isGhostForDept(project: any, dept: string, colKey: string): boolean {
  const stage = project.pipe_stage || 'sales_in'
  if (dept === 'sales') {
    return ['production', 'install', 'prod_review'].includes(stage) && colKey === 'handed_off'
  }
  if (dept === 'production') {
    return ['install', 'sales_close'].includes(stage) && colKey === 'complete'
  }
  if (dept === 'install') {
    return ['prod_review', 'sales_close'].includes(stage) && colKey === 'complete'
  }
  return false
}
