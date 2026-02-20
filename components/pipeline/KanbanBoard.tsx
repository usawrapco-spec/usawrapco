'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PipelineJobCard from '@/components/pipeline/PipelineJobCard'
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
  horizontal?: boolean  // production uses horizontal layout
  onProjectClick: (project: any) => void
  onStageChange?: (projectId: string, newStage: string) => void
  showGhosts?: boolean  // show ghost cards for jobs in other pipelines
  allProjects?: any[]   // full project list for ghost cards
}

export default function KanbanBoard({
  columns,
  projects,
  department,
  profileId,
  orgId,
  horizontal = false,
  onProjectClick,
  onStageChange,
  showGhosts = true,
  allProjects = [],
}: KanbanBoardProps) {
  const [dragOver, setDragOver] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId)
  }

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    setDragOver(columnKey)
  }

  const handleDrop = async (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    setDragOver(null)
    const projectId = e.dataTransfer.getData('projectId')
    if (projectId && onStageChange) {
      onStageChange(projectId, columnKey)
    }
  }

  // Count jobs per column
  const columnData = columns.map(col => ({
    ...col,
    jobs: projects.filter(col.filterFn),
    ghostJobs: showGhosts
      ? allProjects.filter(p => !col.filterFn(p) && isGhostForDept(p, department, col.key))
      : [],
  }))

  return (
    <div style={{
      display: 'flex',
      flexDirection: horizontal ? 'row' : 'row',
      gap: 12,
      overflowX: 'auto',
      padding: '0 0 16px 0',
      minHeight: horizontal ? 'auto' : 'calc(100vh - 200px)',
    }}>
      {columnData.map(col => (
        <div
          key={col.key}
          onDragOver={e => handleDragOver(e, col.key)}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => handleDrop(e, col.key)}
          style={{
            flex: horizontal ? '0 0 280px' : '1 1 0',
            minWidth: horizontal ? 280 : 220,
            maxWidth: horizontal ? 280 : undefined,
            background: dragOver === col.key ? `${col.color}08` : 'var(--surface)',
            border: `1px solid ${dragOver === col.key ? col.color : 'var(--border)'}`,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          {/* Column header */}
          <div style={{
            padding: '12px 14px',
            borderBottom: `2px solid ${col.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <col.icon size={14} color={col.color} />
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                color: col.color,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}>
                {col.label}
              </span>
            </div>
            <span style={{
              background: `${col.color}20`,
              color: col.color,
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 800,
            }}>
              {col.jobs.length}
            </span>
          </div>

          {/* Cards */}
          <div style={{
            padding: 8,
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {col.jobs.length === 0 && col.ghostJobs.length === 0 && (
              <div style={{
                padding: '24px 12px',
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: 12,
                fontStyle: 'italic',
              }}>
                No jobs
              </div>
            )}

            {/* Active jobs */}
            {col.jobs.map(project => (
              <div
                key={project.id}
                draggable
                onDragStart={e => handleDragStart(e, project.id)}
                style={{ cursor: 'grab' }}
              >
                <PipelineJobCard
                  project={project}
                  department={department}
                  isGhost={false}
                  onClick={() => onProjectClick(project)}
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
  )
}

// Determine if a project should show as a ghost in a department
function isGhostForDept(project: any, dept: string, colKey: string): boolean {
  const stage = project.pipe_stage || 'sales_in'

  if (dept === 'sales') {
    // Show ghosts for jobs that left sales but might come back
    return ['production', 'install', 'prod_review'].includes(stage)
      && colKey === 'handed_off'
  }
  if (dept === 'production') {
    // Show ghosts for jobs in install or sales close
    return ['install', 'sales_close'].includes(stage)
      && colKey === 'complete'
  }
  if (dept === 'install') {
    // Show ghosts for jobs in QC or closing
    return ['prod_review', 'sales_close'].includes(stage)
      && colKey === 'complete'
  }
  return false
}
