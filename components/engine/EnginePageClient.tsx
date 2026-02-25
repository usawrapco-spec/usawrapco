'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
  type Node, type Edge, Background, Controls,
  MarkerType, Position, Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { usePhone } from '@/components/phone/PhoneProvider'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp, X, ArrowRight,
  Download, Search, DollarSign, ClipboardCheck, Palette,
  CheckCircle, Printer, Scissors, Calendar, Truck,
  Wrench, Camera, Star, Zap,
  Plus, Play, Pause, Trash2,
  Mail, MessageCircle, Clock, Bell,
  AlertTriangle, UserPlus, FileText,
  Save, Loader2,
  BarChart2, Activity, Users, Settings,
  Phone,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

// ── Stage definitions ─────────────────────────────────────────────
interface StageConfig { key: string; label: string; Icon: LucideIcon; color: string }

const STAGES: StageConfig[] = [
  { key: 'new_lead',          label: 'New Lead',          Icon: Download,       color: '#4f7fff' },
  { key: 'qualified',         label: 'Qualified',         Icon: Search,         color: '#8b5cf6' },
  { key: 'deposit_paid',      label: 'Deposit Paid',      Icon: DollarSign,     color: '#22c07a' },
  { key: 'intake_complete',   label: 'Intake Complete',   Icon: ClipboardCheck, color: '#22d3ee' },
  { key: 'design',            label: 'Design',            Icon: Palette,        color: '#8b5cf6' },
  { key: 'proof_approved',    label: 'Proof Approved',    Icon: CheckCircle,    color: '#22c07a' },
  { key: 'print_queue',       label: 'Print Queue',       Icon: Printer,        color: '#f59e0b' },
  { key: 'cut_prep',          label: 'Cut & Prep',        Icon: Scissors,       color: '#f59e0b' },
  { key: 'qc_check',          label: 'QC Check',          Icon: ClipboardCheck, color: '#22d3ee' },
  { key: 'install_scheduled', label: 'Install Scheduled', Icon: Calendar,       color: '#4f7fff' },
  { key: 'vehicle_checkin',   label: 'Vehicle Check-In',  Icon: Truck,          color: '#f59e0b' },
  { key: 'installing',        label: 'Installing',        Icon: Wrench,         color: '#22c07a' },
  { key: 'final_photos',      label: 'Final Photos',      Icon: Camera,         color: '#8b5cf6' },
  { key: 'complete',          label: 'Complete',          Icon: CheckCircle,    color: '#22c07a' },
  { key: 'review_requested',  label: 'Review Requested',  Icon: Star,           color: '#f59e0b' },
]

// ── Types ─────────────────────────────────────────────────────────
interface StageData {
  key: string
  label: string
  count: number
  value: number
  color: string
  records: any[]
  avgDays: number
}

interface WorkflowStep {
  id: string
  type: 'send_sms' | 'send_email' | 'wait' | 'create_task' | 'notify_team'
  config: Record<string, any>
}

interface Workflow {
  id: string
  name: string
  trigger_type: string
  is_active: boolean
  steps: WorkflowStep[]
  created_at: string
}

interface EngineClientProps {
  profile: Profile
  initialProjects: any[]
  initialProspects: any[]
  initialWorkflows: Workflow[]
}

type TabKey = 'map' | 'funnel' | 'velocity' | 'automations' | 'insights'

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'map',         label: 'Flow Map',    Icon: Activity  },
  { key: 'funnel',      label: 'Funnel',      Icon: BarChart2 },
  { key: 'velocity',    label: 'Velocity',    Icon: TrendingUp },
  { key: 'automations', label: 'Automations', Icon: Zap        },
  { key: 'insights',    label: 'Insights',    Icon: Star       },
]

// ── Automation constants ──────────────────────────────────────────
interface TriggerConfig { id: string; label: string; Icon: LucideIcon; color: string }
interface StepTypeConfig { id: string; label: string; Icon: LucideIcon; color: string }

const WF_TRIGGERS: TriggerConfig[] = [
  { id: 'new_lead',          label: 'New Lead Submitted',    Icon: UserPlus,       color: '#22c07a' },
  { id: 'quote_not_viewed',  label: 'Quote Not Viewed 48h',  Icon: FileText,       color: '#f59e0b' },
  { id: 'design_approved',   label: 'Design Approved',       Icon: CheckCircle,    color: '#4f7fff' },
  { id: 'install_complete',  label: 'Install Complete',      Icon: CheckCircle,    color: '#22d3ee' },
  { id: 'payment_received',  label: 'Payment Received',      Icon: DollarSign,     color: '#22c07a' },
  { id: 'job_overdue',       label: 'Job Overdue',           Icon: AlertTriangle,  color: '#f25a5a' },
]

const WF_STEP_TYPES: StepTypeConfig[] = [
  { id: 'send_sms',    label: 'Send SMS',       Icon: MessageCircle, color: '#22c07a' },
  { id: 'send_email',  label: 'Send Email',     Icon: Mail,          color: '#4f7fff' },
  { id: 'wait',        label: 'Wait',           Icon: Clock,         color: '#f59e0b' },
  { id: 'create_task', label: 'Create Task',    Icon: ClipboardCheck,color: '#8b5cf6' },
  { id: 'notify_team', label: 'Notify Team',    Icon: Bell,          color: '#f25a5a' },
]

const WF_TEMPLATES: Omit<Workflow, 'id' | 'created_at'>[] = [
  {
    name: '48-Hour Quote Follow-Up',
    trigger_type: 'quote_not_viewed', is_active: false,
    steps: [
      { id: '1', type: 'wait',     config: { duration: 48, unit: 'hours' } },
      { id: '2', type: 'send_sms', config: { message: 'Hi {{customer_name}}, just checking in on your quote for {{vehicle_desc}}. Any questions? Reply here!' } },
      { id: '3', type: 'create_task', config: { title: 'Follow up on unviewed quote — {{customer_name}}' } },
    ],
  },
  {
    name: 'Post-Install Review Request',
    trigger_type: 'install_complete', is_active: false,
    steps: [
      { id: '1', type: 'wait',       config: { duration: 24, unit: 'hours' } },
      { id: '2', type: 'send_email', config: { subject: 'How does your new wrap look?', body: "Hi {{customer_name}},\n\nWe hope you're loving your new wrap! Please leave us a review:\n{{review_link}}\n\nThank you!" } },
      { id: '3', type: 'wait',       config: { duration: 7, unit: 'days' } },
      { id: '4', type: 'send_sms',   config: { message: 'Hey {{customer_name}}! Quick reminder — a review would mean a lot to us: {{review_link}}' } },
    ],
  },
  {
    name: 'Overdue Job Alert',
    trigger_type: 'job_overdue', is_active: false,
    steps: [
      { id: '1', type: 'notify_team', config: { message: 'Job {{job_title}} is overdue — {{days_overdue}} days behind schedule.' } },
      { id: '2', type: 'create_task', config: { title: 'Review overdue job: {{job_title}}' } },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────
function sumRev(arr: any[]): number {
  return arr.reduce((s, p) => s + (p.revenue || p.estimated_revenue || 0), 0)
}

function avgDaysCalc(arr: any[]): number {
  if (!arr.length) return 0
  const now = Date.now()
  return arr.reduce((s, p) => s + (now - new Date(p.updated_at || p.created_at).getTime()) / 86400000, 0) / arr.length
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toLocaleString()}`
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function computeStageData(projects: any[], prospects: any[]): Record<string, StageData> {
  const newLeads       = prospects.filter(p => p.status === 'new')
  const qualified      = prospects.filter(p => ['hot', 'warm'].includes(p.status) || (p.score && p.score >= 50))
  const depositPaid    = projects.filter(p => p.pipe_stage === 'sales_in')
  const intakeComplete = projects.filter(p => p.pipe_stage === 'sales_in' && (p.form_data as any)?.intake_completed)
  const designPhase    = projects.filter(p => p.pipe_stage === 'production' && !(p.form_data as any)?.design_approved)
  const proofApproved  = projects.filter(p => p.pipe_stage === 'production' && (p.form_data as any)?.design_approved)
  const printQueue     = projects.filter(p => p.pipe_stage === 'production' && (p.form_data as any)?.vinyl_approved)
  const cutPrep        = projects.filter(p => p.pipe_stage === 'install' && !(p.form_data as any)?.install_date)
  const qcCheck        = projects.filter(p => p.pipe_stage === 'prod_review')
  const installSched   = projects.filter(p => p.pipe_stage === 'install' && (p.form_data as any)?.install_date)
  const vehicleCheckin = projects.filter(p => p.pipe_stage === 'install' && (p.form_data as any)?.vehicle_checked_in)
  const installing     = projects.filter(p => p.pipe_stage === 'install' && (p.form_data as any)?.install_started)
  const finalPhotos    = projects.filter(p => p.pipe_stage === 'sales_close')
  const complete       = projects.filter(p => p.pipe_stage === 'done' || p.status === 'closed')
  const reviewReq      = projects.filter(p => (p.form_data as any)?.review_requested)

  const map: Record<string, any[]> = {
    new_lead: newLeads, qualified, deposit_paid: depositPaid,
    intake_complete: intakeComplete, design: designPhase,
    proof_approved: proofApproved, print_queue: printQueue,
    cut_prep: cutPrep, qc_check: qcCheck,
    install_scheduled: installSched, vehicle_checkin: vehicleCheckin,
    installing, final_photos: finalPhotos, complete, review_requested: reviewReq,
  }

  const result: Record<string, StageData> = {}
  STAGES.forEach(s => {
    const records = map[s.key] || []
    result[s.key] = {
      key: s.key, label: s.label, color: s.color,
      count: records.length,
      value: sumRev(records),
      records: records.slice(0, 50),
      avgDays: avgDaysCalc(records),
    }
  })
  return result
}

// ── ReactFlow: StageNode ──────────────────────────────────────────
function StageNode({ data }: { data: StageData & { onOpen: (k: string) => void } }) {
  const stage = STAGES.find(s => s.key === data.key) || STAGES[0]
  const { Icon } = stage
  const color = data.color
  const isStuck = data.avgDays > 7

  return (
    <div
      onClick={() => data.onOpen(data.key)}
      title={data.avgDays > 0 ? `Avg ${data.avgDays.toFixed(1)}d at stage` : undefined}
      style={{
        width: 128, padding: '14px 8px', borderRadius: 14,
        background: `linear-gradient(135deg, ${color}12, ${color}06)`,
        border: `1.5px solid ${color}40`,
        cursor: 'pointer', textAlign: 'center', position: 'relative',
        transition: 'all 0.2s',
        boxShadow: data.count > 0 ? `0 4px 20px ${color}15` : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}30`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.borderColor = `${color}40`
        e.currentTarget.style.boxShadow = data.count > 0 ? `0 4px 20px ${color}15` : 'none'
      }}
    >
      <Handle type="target" position={Position.Left}  style={{ background: color, width: 6, height: 6, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 6, height: 6, border: 'none' }} />

      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, color, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.2 }}>
        {data.label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4, lineHeight: 1 }}>
        {data.count}
      </div>
      {data.value > 0 && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
          {fmtMoney(data.value)}
        </div>
      )}
      {data.count > 0 && (
        <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: isStuck ? '#f25a5a' : color }}>
          {isStuck && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #f25a5a', animation: 'pulseRing 2s infinite' }} />}
        </div>
      )}
    </div>
  )
}

const nodeTypes = { stageNode: StageNode }

// ── Stage Drawer ──────────────────────────────────────────────────
function StageDrawer({ data, onClose, onNavigate }: {
  data: StageData
  onClose: () => void
  onNavigate: (r: any) => void
}) {
  const stage = STAGES.find(s => s.key === data.key) || STAGES[0]
  const { Icon } = stage

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', zIndex: 9 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 400,
        background: 'var(--surface)', borderLeft: '1px solid var(--surface2)',
        display: 'flex', flexDirection: 'column', zIndex: 10,
        boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        animation: 'slideInRight .25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${data.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} style={{ color: data.color }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: data.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {data.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                {data.count} records &middot; {fmtMoney(data.value)}
                {data.avgDays > 0 && ` · avg ${data.avgDays.toFixed(1)}d`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: '1px solid var(--surface2)', color: 'var(--text3)', cursor: 'pointer', padding: 8, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        {/* Bottleneck warning */}
        {data.avgDays > 7 && data.count > 0 && (
          <div style={{ padding: '8px 20px', background: 'rgba(242,90,90,0.08)', borderBottom: '1px solid rgba(242,90,90,0.2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--red)', fontWeight: 700, flexShrink: 0 }}>
            <AlertTriangle size={12} />
            Avg {data.avgDays.toFixed(1)} days — possible bottleneck
          </div>
        )}

        {/* Records */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.records.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>
              No records at this stage
            </div>
          )}
          {data.records.map((r: any, i: number) => (
            <div
              key={r.id || i}
              onClick={() => onNavigate(r)}
              style={{ padding: '11px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--surface2)', cursor: 'pointer', transition: 'all 0.15s', animation: `staggerIn .3s ease ${i * 0.03}s both` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = data.color; e.currentTarget.style.transform = 'translateX(3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface2)'; e.currentTarget.style.transform = 'translateX(0)' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                {r.business_name || r.company || r.title || r.name || '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {(r.customer as any)?.name || r.email || ''}
                {r.updated_at ? ` · ${relTime(r.updated_at)}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 11, alignItems: 'center' }}>
                {r.revenue > 0 && <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{fmtMoney(r.revenue)}</span>}
                {r.estimated_revenue > 0 && <span style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>~{fmtMoney(r.estimated_revenue)}</span>}
                {r.score != null && <span style={{ color: r.score >= 60 ? 'var(--green)' : 'var(--amber)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>Score: {r.score}</span>}
                {r.status && (
                  <span style={{ padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${data.color}18`, color: data.color, textTransform: 'uppercase' }}>
                    {r.status}
                  </span>
                )}
                <ArrowRight size={10} style={{ color: 'var(--text3)', marginLeft: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Funnel Tab ────────────────────────────────────────────────────
function FunnelTab({ stageData, onOpenDrawer }: { stageData: Record<string, StageData>; onOpenDrawer: (k: string) => void }) {
  const maxCount = Math.max(...STAGES.map(s => stageData[s.key]?.count || 0), 1)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 32px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {STAGES.map((stage, i) => {
          const data = stageData[stage.key]
          const prev = i > 0 ? stageData[STAGES[i - 1].key] : null
          const convRate = prev && prev.count > 0 ? (data.count / prev.count) * 100 : null
          const pct = (data.count / maxCount) * 100

          return (
            <div key={stage.key} style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
              {convRate !== null && (
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', padding: '2px 0', color: convRate >= 70 ? 'var(--green)' : convRate >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                  {convRate.toFixed(0)}% conversion
                </div>
              )}
              <button
                onClick={() => onOpenDrawer(stage.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0' }}
              >
                <div style={{ width: 130, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textAlign: 'right', flexShrink: 0 }}>
                  {stage.label}
                </div>
                <div style={{ flex: 1, height: 36, background: 'var(--surface2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color}88)`,
                    borderRadius: 6,
                    transition: 'width 0.6s ease',
                    minWidth: data.count > 0 ? 6 : 0,
                  }} />
                  {data.count > 0 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 8, pointerEvents: 'none' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{data.count}</span>
                      {data.value > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{fmtMoney(data.value)}</span>}
                    </div>
                  )}
                </div>
                <div style={{ width: 38, fontSize: 12, fontWeight: 900, color: stage.color, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', flexShrink: 0 }}>
                  {data.count}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Velocity Tab ──────────────────────────────────────────────────
function VelocityTab({ stageData, allProjects, onNavigate }: {
  stageData: Record<string, StageData>
  allProjects: any[]
  onNavigate: (id: string) => void
}) {
  const maxDays = Math.max(...STAGES.map(s => stageData[s.key]?.avgDays || 0), 1)

  const atRisk = allProjects
    .filter(p => !['closed', 'cancelled'].includes(p.status || '') && p.pipe_stage !== 'done')
    .map(p => ({
      ...p,
      daysStuck: (Date.now() - new Date(p.updated_at || p.created_at).getTime()) / 86400000,
    }))
    .filter(p => p.daysStuck > 14)
    .sort((a, b) => b.daysStuck - a.daysStuck)
    .slice(0, 20)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Velocity chart */}
        <div>
          <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Avg Days Per Stage
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {STAGES.map((stage, i) => {
              const avg = stageData[stage.key]?.avgDays || 0
              const pct = (avg / maxDays) * 100
              const barColor = avg === 0 ? 'var(--surface2)' : avg > 7 ? 'var(--red)' : avg > 4 ? 'var(--amber)' : 'var(--green)'
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}>
                  <div style={{ width: 138, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textAlign: 'right', flexShrink: 0 }}>{stage.label}</div>
                  <div style={{ flex: 1, height: 24, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.7s ease', minWidth: avg > 0 ? 4 : 0, opacity: 0.85 }} />
                  </div>
                  <div style={{ width: 42, fontSize: 12, fontWeight: 900, color: barColor, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', flexShrink: 0 }}>
                    {avg > 0 ? `${avg.toFixed(1)}d` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: 'var(--green)' }}>● Healthy (&lt;4d)</span>
            <span style={{ color: 'var(--amber)' }}>● Moderate (4–7d)</span>
            <span style={{ color: 'var(--red)' }}>● Bottleneck (&gt;7d)</span>
          </div>
        </div>

        {/* At-risk deals */}
        {atRisk.length > 0 && (
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} />
              At-Risk Deals ({atRisk.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
              {atRisk.map(p => (
                <div
                  key={p.id}
                  onClick={() => onNavigate(p.id)}
                  style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid rgba(242,90,90,0.22)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(242,90,90,0.22)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{p.title || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{(p.customer as any)?.name || ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.floor(p.daysStuck)}d stuck
                    </span>
                    {p.revenue > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtMoney(p.revenue)}</span>}
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>
                      {p.pipe_stage || p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Automations Tab ───────────────────────────────────────────────
function AutomationsTab({ workflows, onWorkflowsChange }: {
  workflows: Workflow[]
  onWorkflowsChange: (w: Workflow[]) => void
}) {
  const supabase = createClient()
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [saving, setSaving] = useState(false)

  const blank: Workflow = { id: '', name: '', trigger_type: '', is_active: false, steps: [], created_at: '' }

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('workflows').update({ is_active }).eq('id', id)
    onWorkflowsChange(workflows.map(w => w.id === id ? { ...w, is_active } : w))
  }

  const del = async (id: string) => {
    if (!confirm('Delete this workflow?')) return
    await supabase.from('workflows').delete().eq('id', id)
    onWorkflowsChange(workflows.filter(w => w.id !== id))
  }

  const save = async () => {
    if (!editing || !editing.name || !editing.trigger_type) return
    setSaving(true)
    try {
      if (editing.id) {
        await supabase.from('workflows').update({ name: editing.name, trigger_type: editing.trigger_type, steps: editing.steps }).eq('id', editing.id)
        onWorkflowsChange(workflows.map(w => w.id === editing.id ? editing : w))
      } else {
        const { data } = await supabase.from('workflows').insert({ name: editing.name, trigger_type: editing.trigger_type, is_active: false, steps: editing.steps }).select().single()
        if (data) onWorkflowsChange([data as Workflow, ...workflows])
      }
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const useTemplate = async (tpl: Omit<Workflow, 'id' | 'created_at'>) => {
    const { data } = await supabase.from('workflows').insert({ name: tpl.name, trigger_type: tpl.trigger_type, is_active: false, steps: tpl.steps }).select().single()
    if (data) onWorkflowsChange([data as Workflow, ...workflows])
  }

  const addStep = () => {
    if (!editing) return
    setEditing({ ...editing, steps: [...editing.steps, { id: crypto.randomUUID(), type: 'wait', config: { duration: 24, unit: 'hours' } }] })
  }

  const removeStep = (idx: number) => {
    if (!editing) return
    setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== idx) })
  }

  const updateStep = (idx: number, updates: Partial<WorkflowStep>) => {
    if (!editing) return
    setEditing({ ...editing, steps: editing.steps.map((s, i) => i === idx ? { ...s, ...updates } : s) })
  }

  // ── Form view ──────────────────────────────────────────────────
  if (editing !== null) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: '20px 32px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <button onClick={() => setEditing(null)} style={{ background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700 }}>
              Cancel
            </button>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, color: 'var(--text1)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {editing.id ? 'Edit Workflow' : 'New Workflow'}
            </h2>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Name</label>
            <input
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="e.g. 48-Hour Quote Follow-Up"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, color: 'var(--text1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Trigger */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Trigger Event</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {WF_TRIGGERS.map(({ id, label, Icon: TIcon, color }) => (
                <button
                  key={id}
                  onClick={() => setEditing({ ...editing, trigger_type: id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${editing.trigger_type === id ? color : 'var(--surface2)'}`, background: editing.trigger_type === id ? `${color}18` : 'var(--surface)', color: editing.trigger_type === id ? color : 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'left' }}
                >
                  <TIcon size={13} style={{ flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.3 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>Steps</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {editing.steps.map((step, idx) => {
                const stepInfo = WF_STEP_TYPES.find(s => s.id === step.type)
                return (
                  <div key={step.id} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>Step {idx + 1}</span>
                      <select
                        value={step.type}
                        onChange={e => updateStep(idx, { type: e.target.value as WorkflowStep['type'], config: {} })}
                        style={{ flex: 1, padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: stepInfo?.color || 'var(--text1)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                      >
                        {WF_STEP_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <button onClick={() => removeStep(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
                        <X size={14} />
                      </button>
                    </div>

                    {step.type === 'wait' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" min={1} value={step.config.duration || ''} onChange={e => updateStep(idx, { config: { ...step.config, duration: +e.target.value } })}
                          style={{ width: 70, padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none' }} />
                        <select value={step.config.unit || 'hours'} onChange={e => updateStep(idx, { config: { ...step.config, unit: e.target.value } })}
                          style={{ padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none' }}>
                          <option value="minutes">minutes</option>
                          <option value="hours">hours</option>
                          <option value="days">days</option>
                        </select>
                      </div>
                    )}

                    {(step.type === 'send_sms' || step.type === 'notify_team') && (
                      <textarea value={step.config.message || ''} onChange={e => updateStep(idx, { config: { ...step.config, message: e.target.value } })}
                        placeholder="Message... Use {{customer_name}}, {{job_title}}, {{review_link}}"
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }} />
                    )}

                    {step.type === 'send_email' && (
                      <>
                        <input value={step.config.subject || ''} onChange={e => updateStep(idx, { config: { ...step.config, subject: e.target.value } })}
                          placeholder="Subject" style={{ width: '100%', padding: '7px 9px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }} />
                        <textarea value={step.config.body || ''} onChange={e => updateStep(idx, { config: { ...step.config, body: e.target.value } })}
                          placeholder="Email body..."
                          style={{ width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }} />
                      </>
                    )}

                    {step.type === 'create_task' && (
                      <input value={step.config.title || ''} onChange={e => updateStep(idx, { config: { ...step.config, title: e.target.value } })}
                        placeholder="Task title... e.g. Follow up on {{customer_name}}"
                        style={{ width: '100%', padding: '7px 9px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                )
              })}
              <button onClick={addStep} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px dashed var(--surface2)', borderRadius: 8, cursor: 'pointer', color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
                <Plus size={14} />Add Step
              </button>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !editing.name || !editing.trigger_type}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: 'var(--accent)', border: 'none', borderRadius: 8, cursor: saving || !editing.name || !editing.trigger_type ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, opacity: saving || !editing.name || !editing.trigger_type ? 0.5 : 1 }}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <Save size={14} />}
            Save Workflow
          </button>
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 32px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Automations
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>
              Trigger emails, SMS, tasks, and alerts automatically based on pipeline events
            </p>
          </div>
          <button
            onClick={() => setEditing({ ...blank })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}
          >
            <Plus size={14} />New Workflow
          </button>
        </div>

        {/* Templates when empty */}
        {workflows.length === 0 && (
          <div style={{ marginBottom: 28 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Quick-Start Templates</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {WF_TEMPLATES.map((tpl, i) => {
                const trig = WF_TRIGGERS.find(t => t.id === tpl.trigger_type)
                return (
                  <div
                    key={i}
                    onClick={() => useTemplate(tpl)}
                    style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface2)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      {trig && <trig.Icon size={13} style={{ color: trig.color }} />}
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{tpl.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {trig?.label} · {tpl.steps.length} steps
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Workflow list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workflows.map(wf => {
            const trig = WF_TRIGGERS.find(t => t.id === wf.trigger_type)
            return (
              <div key={wf.id} style={{ padding: '14px 16px', background: 'var(--surface)', border: `1px solid ${wf.is_active ? 'rgba(34,192,122,0.3)' : 'var(--surface2)'}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: trig ? `${trig.color}18` : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {trig ? <trig.Icon size={16} style={{ color: trig.color }} /> : <Zap size={16} style={{ color: 'var(--text3)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{wf.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {trig?.label || wf.trigger_type} &middot; {wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggle(wf.id, !wf.is_active)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: wf.is_active ? 'rgba(34,192,122,0.18)' : 'var(--surface2)', color: wf.is_active ? 'var(--green)' : 'var(--text3)', fontSize: 11, fontWeight: 700 }}>
                    {wf.is_active ? <Play size={11} /> : <Pause size={11} />}
                    {wf.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button onClick={() => setEditing(wf)} style={{ background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '5px 8px', borderRadius: 6 }}>
                    <Settings size={13} />
                  </button>
                  <button onClick={() => del(wf.id)} style={{ background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '5px 8px', borderRadius: 6 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
          {workflows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)', fontSize: 13 }}>
              No workflows yet. Use a template above or create one from scratch.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Insights Tab ──────────────────────────────────────────────────
function InsightsTab({ projects, prospects, stageData, onNavigate }: {
  projects: any[]
  prospects: any[]
  stageData: Record<string, StageData>
  onNavigate: (id: string) => void
}) {
  const now = new Date()
  const d7ago   = new Date(now.getTime() - 7  * 86400000)
  const d7ahead = new Date(now.getTime() + 7  * 86400000)

  const recentWins = projects
    .filter(p => (p.status === 'closed' || p.pipe_stage === 'done') && new Date(p.updated_at || p.created_at) >= d7ago)
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 10)

  const upcoming = projects
    .filter(p => {
      const fd = p.form_data as any
      if (!fd?.install_date) return false
      const d = new Date(fd.install_date)
      return d >= now && d <= d7ahead
    })
    .sort((a, b) => new Date((a.form_data as any).install_date).getTime() - new Date((b.form_data as any).install_date).getTime())
    .slice(0, 10)

  // Agent leaderboard
  const agentMap = new Map<string, { name: string; revenue: number; deals: number; pipeline: number }>()
  projects.forEach(p => {
    const agent = p.agent as any
    if (!agent?.id || !agent?.name) return
    if (!agentMap.has(agent.id)) agentMap.set(agent.id, { name: agent.name, revenue: 0, deals: 0, pipeline: 0 })
    const e = agentMap.get(agent.id)!
    if (p.status === 'closed' || p.pipe_stage === 'done') {
      e.revenue += p.revenue || 0
      e.deals += 1
    } else {
      e.pipeline += p.revenue || 0
    }
  })
  const leaderboard = Array.from(agentMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

  const bottlenecks = STAGES.filter(s => (stageData[s.key]?.avgDays || 0) > 7 && (stageData[s.key]?.count || 0) > 0)

  // Hot prospects
  const hotProspects = prospects
    .filter(p => ['hot'].includes(p.status) || (p.score && p.score >= 70))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 32px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Bottlenecks alert row */}
        {bottlenecks.length > 0 && (
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={14} />Pipeline Bottlenecks
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {bottlenecks.map(s => {
                const d = stageData[s.key]
                return (
                  <div key={s.key} style={{ padding: '8px 14px', background: 'rgba(242,90,90,0.07)', border: '1px solid rgba(242,90,90,0.22)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <s.Icon size={13} style={{ color: s.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--red)', fontWeight: 800 }}>avg {d.avgDays.toFixed(1)}d</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.count} records</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Recent Wins */}
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Star size={14} />Recent Wins (7d)
            </h3>
            {recentWins.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>No closed deals this week.</p>
              : recentWins.map(p => (
                <div key={p.id} onClick={() => onNavigate(p.id)} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid rgba(34,192,122,0.18)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.transform = 'translateX(3px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,192,122,0.18)'; e.currentTarget.style.transform = 'translateX(0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{p.title || '—'}</span>
                    {p.revenue > 0 && <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtMoney(p.revenue)}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {(p.customer as any)?.name || ''}{(p.agent as any)?.name ? ` · ${(p.agent as any).name}` : ''} · {relTime(p.updated_at || p.created_at)}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Upcoming Installs */}
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Calendar size={14} />Upcoming Installs (7d)
            </h3>
            {upcoming.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>No installs scheduled this week.</p>
              : upcoming.map(p => (
                <div key={p.id} onClick={() => onNavigate(p.id)} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.transform = 'translateX(3px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.18)'; e.currentTarget.style.transform = 'translateX(0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{p.title || '—'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {new Date((p.form_data as any).install_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {(p.customer as any)?.name || ''}{p.revenue > 0 ? ` · ${fmtMoney(p.revenue)}` : ''}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Hot Prospects */}
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Phone size={14} />Hot Prospects
            </h3>
            {hotProspects.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>No hot prospects at the moment.</p>
              : hotProspects.map(p => (
                <div key={p.id} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid rgba(79,127,255,0.18)', borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{p.business_name || p.company || p.name || '—'}</span>
                    {p.score != null && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: p.score >= 70 ? 'var(--green)' : 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                        Score: {p.score}
                      </span>
                    )}
                  </div>
                  {p.estimated_revenue > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, marginTop: 2 }}>
                      ~{fmtMoney(p.estimated_revenue)}
                    </div>
                  )}
                </div>
              ))
            }
          </div>

          {/* Agent Leaderboard */}
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Users size={14} />Agent Leaderboard
            </h3>
            {leaderboard.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>No agent data available.</p>
              : leaderboard.map((agent, i) => {
                const rankColors = ['var(--amber)', 'var(--text2)', '#cd7f32']
                return (
                  <div key={agent.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 6, border: '1px solid var(--surface2)' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: i < 3 ? rankColors[i] : 'var(--text3)', width: 20, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{fmtMoney(agent.revenue)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{agent.deals}W</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{fmtMoney(agent.pipeline)} pipe</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function EnginePageClient({
  profile,
  initialProjects,
  initialProspects,
  initialWorkflows,
}: EngineClientProps) {
  const supabase = createClient()
  const phone = usePhone()
  const router = useRouter()
  const orgId = profile.org_id || ORG_ID

  const [projects,  setProjects]  = useState<any[]>(initialProjects)
  const [prospects, setProspects] = useState<any[]>(initialProspects)
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows)
  const [activeTab, setActiveTab] = useState<TabKey>('map')
  const [drawerKey, setDrawerKey] = useState<string | null>(null)
  const [period,    setPeriod]    = useState<'today' | 'week' | 'month' | 'all'>('month')

  // ── Period filter ─────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    if (period === 'all') return projects
    const now = new Date()
    const cutoff = new Date()
    if (period === 'today')       cutoff.setHours(0, 0, 0, 0)
    else if (period === 'week')   cutoff.setDate(now.getDate() - 7)
    else if (period === 'month')  cutoff.setDate(now.getDate() - 30)
    return projects.filter(p => new Date(p.created_at) >= cutoff)
  }, [projects, period])

  const filteredProspects = useMemo(() => {
    if (period === 'all') return prospects
    const now = new Date()
    const cutoff = new Date()
    if (period === 'today')       cutoff.setHours(0, 0, 0, 0)
    else if (period === 'week')   cutoff.setDate(now.getDate() - 7)
    else if (period === 'month')  cutoff.setDate(now.getDate() - 30)
    return prospects.filter(p => new Date(p.created_at) >= cutoff)
  }, [prospects, period])

  // ── Stage data ────────────────────────────────────────────────
  const stageData = useMemo(
    () => computeStageData(filteredProjects, filteredProspects),
    [filteredProjects, filteredProspects]
  )

  // ── KPIs ──────────────────────────────────────────────────────
  const closedProjects = filteredProjects.filter(p => p.status === 'closed' || p.pipe_stage === 'done')
  const activeProjects = filteredProjects.filter(p => !['closed', 'cancelled'].includes(p.status || ''))
  const pipelineValue  = activeProjects.reduce((s, p) => s + (p.revenue || 0), 0)
  const wonRevenue     = closedProjects.reduce((s, p) => s + (p.revenue || 0), 0)
  const wonProfit      = closedProjects.reduce((s, p) => s + (p.profit || 0), 0)
  const avgGpm         = wonRevenue > 0 ? (wonProfit / wonRevenue) * 100 : 0
  const avgDealSize    = closedProjects.length ? wonRevenue / closedProjects.length : 0
  const totalLeads     = filteredProspects.length + filteredProjects.length
  const convRate       = totalLeads > 0 ? (closedProjects.length / totalLeads) * 100 : 0

  // ── Realtime ──────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, title, status, pipe_stage, revenue, profit, form_data, customer:customer_id(name), agent:agent_id(id, name), created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) setProjects(data)
  }, [supabase, orgId])

  const loadProspects = useCallback(async () => {
    const { data } = await supabase
      .from('prospects')
      .select('id, status, score, business_name, company, name, email, phone, estimated_revenue, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) setProspects(data)
  }, [supabase, orgId])

  useEffect(() => {
    const channel = supabase
      .channel('engine-rt-' + orgId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects',  filter: `org_id=eq.${orgId}` }, loadProjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects', filter: `org_id=eq.${orgId}` }, loadProspects)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, orgId, loadProjects, loadProspects])

  // ── ReactFlow nodes ───────────────────────────────────────────
  const nodes: Node[] = useMemo(() => {
    const COL_W = 168
    const ROW_H = 145
    const rows = [STAGES.slice(0, 5), STAGES.slice(5, 10), STAGES.slice(10, 15)]
    return rows.flatMap((row, ri) =>
      row.map((stage, ci) => ({
        id: stage.key,
        type: 'stageNode',
        position: { x: ci * COL_W, y: ri * ROW_H },
        data: {
          ...(stageData[stage.key] || { key: stage.key, label: stage.label, count: 0, value: 0, color: stage.color, records: [], avgDays: 0 }),
          onOpen: (k: string) => setDrawerKey(k),
        },
      }))
    )
  }, [stageData])

  const edges: Edge[] = useMemo(() =>
    STAGES.slice(0, -1).map((s, i) => {
      const next = STAGES[i + 1]
      return {
        id: `${s.key}-${next.key}`,
        source: s.key,
        target: next.key,
        animated: true,
        style: { stroke: s.color, strokeWidth: 2, opacity: 0.55 },
        markerEnd: { type: MarkerType.ArrowClosed, color: next.color, width: 12, height: 12 },
        type: i === 4 || i === 9 ? 'smoothstep' : 'default',
      }
    }), [])

  const drawerData = drawerKey ? stageData[drawerKey] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── KPI Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 22px', background: 'var(--surface)', borderBottom: '1px solid var(--surface2)', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(79,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 17, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Revenue Engine
          </span>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          {([
            { label: 'Pipeline',  value: fmtMoney(pipelineValue), color: 'var(--accent)' },
            { label: 'Won',       value: fmtMoney(wonRevenue),    color: 'var(--green)'  },
            { label: 'Avg Deal',  value: fmtMoney(avgDealSize),   color: 'var(--cyan)'   },
            { label: 'GPM',       value: `${avgGpm.toFixed(0)}%`, color: avgGpm >= 45 ? 'var(--green)' : avgGpm >= 35 ? 'var(--amber)' : 'var(--red)' },
            { label: 'Conv.',     value: `${convRate.toFixed(1)}%`, color: 'var(--purple)' },
          ] as const).map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.1 }}>{value}</div>
            </div>
          ))}

          {/* Active call indicator */}
          {phone && phone.callState !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'rgba(34,192,122,0.15)', border: '1px solid rgba(34,192,122,0.35)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                {phone.callState === 'in-call' ? `In Call · ${phone.activeName || phone.activeNumber}` : phone.callState}
              </span>
            </div>
          )}
        </div>

        {/* Period picker */}
        <div style={{ display: 'flex', gap: 1, padding: 2, background: 'var(--surface2)', borderRadius: 7 }}>
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: 'none', background: period === p ? 'var(--bg)' : 'transparent', color: period === p ? 'var(--text1)' : 'var(--text3)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, padding: '0 18px', background: 'var(--surface)', borderBottom: '1px solid var(--surface2)', flexShrink: 0 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === key ? 'var(--accent)' : 'var(--text3)', fontSize: 13, fontWeight: activeTab === key ? 700 : 600, transition: 'color 0.15s', marginBottom: -1 }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Flow Map */}
        {activeTab === 'map' && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            proOptions={{ hideAttribution: true }}
            style={{ height: '100%', background: '#0d0f14' }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background color="#1a1d2720" gap={24} size={1} />
            <Controls showInteractive={false} style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10 }} />
          </ReactFlow>
        )}

        {activeTab === 'funnel' && (
          <FunnelTab stageData={stageData} onOpenDrawer={setDrawerKey} />
        )}

        {activeTab === 'velocity' && (
          <VelocityTab stageData={stageData} allProjects={projects} onNavigate={id => router.push(`/projects/${id}`)} />
        )}

        {activeTab === 'automations' && (
          <AutomationsTab workflows={workflows} onWorkflowsChange={setWorkflows} />
        )}

        {activeTab === 'insights' && (
          <InsightsTab projects={projects} prospects={prospects} stageData={stageData} onNavigate={id => router.push(`/projects/${id}`)} />
        )}

        {/* Stage Drawer (map + funnel tabs) */}
        {drawerData && (
          <StageDrawer
            data={drawerData}
            onClose={() => setDrawerKey(null)}
            onNavigate={r => {
              setDrawerKey(null)
              if (r.pipe_stage) router.push(`/projects/${r.id}`)
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes pulseRing { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.5)} }
        @keyframes slideInRight { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeIn    { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes staggerIn { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
