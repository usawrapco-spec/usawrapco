'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  Clock,
  Clipboard,
  Printer,
  Wrench,
  Search,
  DollarSign,
  X,
  Undo2,
  Play,
  Pause,
  Square,
  Check,
  AlertTriangle,
} from 'lucide-react'

// ── Types & Constants ──────────────────────────────────────────────────────────

interface ApprovalModalProps {
  project: any
  profile: any
  onClose: () => void
  onUpdate: (project: any) => void
}

const PIPE_STAGES = ['sales_in', 'production', 'install', 'prod_review', 'sales_close'] as const
type PipeStage = (typeof PIPE_STAGES)[number]

const STAGE_META: Record<
  PipeStage,
  { label: string; icon: typeof Clipboard; color: string }
> = {
  sales_in:    { label: 'Sales Intake',     icon: Clipboard,  color: '#4f7fff' },
  production:  { label: 'Production',       icon: Printer,    color: '#22c07a' },
  install:     { label: 'Install',          icon: Wrench,     color: '#22d3ee' },
  prod_review: { label: 'QC Review',        icon: Search,     color: '#f59e0b' },
  sales_close: { label: 'Sales Approval',   icon: DollarSign, color: '#8b5cf6' },
}

const SEND_BACK_REASONS: Record<string, string[]> = {
  production:  ['Incorrect scope', 'Missing design files', 'Price needs adjustment', 'Customer changed specs', 'Installer not assigned', 'Other'],
  install:     ['Vinyl defect', 'Wrong color/material', 'Dimensions mismatch', 'Missing panels', 'Customer postponed', 'Other'],
  prod_review: ['Quality issue', 'Seams not aligned', 'Bubbles/lifting', 'Wrong vehicle', 'Missing coverage', 'Other'],
  sales_close: ['GPM below threshold', 'Hours over budget', 'Customer dispute', 'Missing photos', 'Reprint not logged', 'Other'],
}

const PRE_INSTALL_CHECKS = [
  'Vinyl inspected -- no visible defects',
  'Color confirmed -- matches approved design',
  'Print dimensions correct',
  'Vehicle surface prepped & clean',
]

const POST_INSTALL_CHECKS = [
  'Post-heat applied throughout',
  'No bubbles or lifting edges',
  'Vehicle cleaned & presentable',
  'Edges properly finished & tucked',
  'Seams aligned and hidden',
  'Photos taken for record',
]

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

const fP = (n: number) => Math.round(n) + '%'

const todayISO = () => new Date().toISOString().split('T')[0]

// ── Helpers ────────────────────────────────────────────────────────────────────

function stageIndex(stage: string): number {
  return PIPE_STAGES.indexOf(stage as PipeStage)
}

function prevStage(stage: string): string {
  const idx = stageIndex(stage)
  return idx > 0 ? PIPE_STAGES[idx - 1] : PIPE_STAGES[0]
}

function nextStage(stage: string): string {
  const idx = stageIndex(stage)
  return idx < PIPE_STAGES.length - 1 ? PIPE_STAGES[idx + 1] : 'done'
}

function formatTimer(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ApprovalModal({
  project,
  profile,
  onClose,
  onUpdate,
}: ApprovalModalProps) {
  const router = useRouter()
  const supabase = createClient()

  // ── Core state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PipeStage>(
    (PIPE_STAGES.includes(project.pipe_stage as PipeStage)
      ? project.pipe_stage
      : 'sales_in') as PipeStage
  )
  const [approvals, setApprovals] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // ── Send-back state ──────────────────────────────────────────────────────────
  const [showSendBack, setShowSendBack] = useState(false)
  const [sendBackReason, setSendBackReason] = useState('')
  const [sendBackNotes, setSendBackNotes] = useState('')
  const [sendingBack, setSendingBack] = useState(false)

  // ── Stage 2: Production form ─────────────────────────────────────────────────
  const [prodLinFtPrinted, setProdLinFtPrinted] = useState('')
  const [prodMaterialWidth, setProdMaterialWidth] = useState('54')
  const [prodRollsUsed, setProdRollsUsed] = useState('')
  const [prodMaterialType, setProdMaterialType] = useState('3M IJ180Cv3 Gloss Black')
  const [prodPrintNotes, setProdPrintNotes] = useState('')

  // ── Stage 3: Install state ───────────────────────────────────────────────────
  const [preInstallChecks, setPreInstallChecks] = useState<boolean[]>(
    new Array(PRE_INSTALL_CHECKS.length).fill(false)
  )
  const [vinylConditionNotes, setVinylConditionNotes] = useState('')
  const [vinylAccepted, setVinylAccepted] = useState(false)

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerStarted, setTimerStarted] = useState(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStartTimeRef = useRef<number>(0)
  const timerBaseSecondsRef = useRef<number>(0)

  // Post-install
  const [installFinished, setInstallFinished] = useState(false)
  const [postInstallChecks, setPostInstallChecks] = useState<boolean[]>(
    new Array(POST_INSTALL_CHECKS.length).fill(false)
  )
  const [installActualHours, setInstallActualHours] = useState('')
  const [installDate, setInstallDate] = useState(todayISO())
  const [installerSignature, setInstallerSignature] = useState('')
  const [installFinalNotes, setInstallFinalNotes] = useState('')

  // ── Stage 4: QC state ────────────────────────────────────────────────────────
  const [qcResult, setQcResult] = useState('Pass -- Ship')
  const [qcFinalLinFt, setQcFinalLinFt] = useState('')
  const [qcReprintCost, setQcReprintCost] = useState('')
  const [qcNotes, setQcNotes] = useState('')

  // ── Stage 5: Sales Approval state ────────────────────────────────────────────
  const [salesCloseNotes, setSalesCloseNotes] = useState('')

  // ── Financial calculations ───────────────────────────────────────────────────
  const fin = (project.fin_data as any) || {}
  const fd = (project.form_data as any) || {}

  const salePrice = project.revenue || fin.sales || fin.sale || fd.salePrice || 0
  const cogs = fin.cogs || 0
  const profit = project.profit || fin.profit || salePrice - cogs
  const gpm = project.gpm || fin.gpm || (salePrice > 0 ? (profit / salePrice) * 100 : 0)
  const installPay = fin.labor || fin.install_pay || fd.installPay || 0
  const hrsBudget = fin.laborHrs || fin.hrs || fd.hrsBudget || fd.hrs || 0

  const reprintCost = parseFloat(qcReprintCost) || 0
  const adjProfit = profit - reprintCost
  const adjGpm = salePrice > 0 ? (adjProfit / salePrice) * 100 : 0

  // ── Load approvals on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('stage_approvals')
        .select('*')
        .eq('project_id', project.id)

      if (data) {
        const map: Record<string, any> = {}
        data.forEach((a: any) => {
          map[a.stage] = a
        })
        setApprovals(map)
      }
    }
    load()
  }, [project.id])

  // ── Timer logic ──────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerStartTimeRef.current = Date.now()
    timerBaseSecondsRef.current = timerSeconds
    setTimerRunning(true)
    setTimerStarted(true)
  }, [timerSeconds])

  const pauseTimer = useCallback(() => {
    setTimerRunning(false)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  const finishWrap = useCallback(async () => {
    pauseTimer()
    setInstallFinished(true)

    const durationSeconds = timerSeconds
    const hours = (durationSeconds / 3600).toFixed(2)
    setInstallActualHours(hours)

    // Save to install_sessions
    await supabase.from('install_sessions').insert({
      org_id: project.org_id,
      project_id: project.id,
      installer_id: profile.id,
      started_at: new Date(
        Date.now() - durationSeconds * 1000
      ).toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
  }, [pauseTimer, timerSeconds, project.id, project.org_id, profile.id, supabase])

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor(
          (now - timerStartTimeRef.current) / 1000
        )
        setTimerSeconds(timerBaseSecondsRef.current + elapsed)
      }, 1000)
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [timerRunning])

  // ── Sign off handler ─────────────────────────────────────────────────────────
  const handleSignOff = async (stage: PipeStage) => {
    setSaving(true)
    setSuccessMsg('')

    let checklistData: Record<string, any> = {}
    let notes = ''
    const next = nextStage(stage)

    // Build stage-specific checklist / form data
    switch (stage) {
      case 'sales_in':
        notes = 'Sales intake signed off'
        checklistData = { signedOff: true }
        break

      case 'production':
        notes = prodPrintNotes
        checklistData = {
          linearFtPrinted: parseFloat(prodLinFtPrinted) || 0,
          materialWidthIn: parseFloat(prodMaterialWidth) || 54,
          rollsUsed: parseFloat(prodRollsUsed) || 0,
          materialType: prodMaterialType,
          printNotes: prodPrintNotes,
        }
        break

      case 'install':
        notes = installFinalNotes
        checklistData = {
          preInstallChecks: PRE_INSTALL_CHECKS.reduce(
            (acc, label, i) => ({ ...acc, [label]: postInstallChecks[i] }),
            {}
          ),
          postInstallChecks: POST_INSTALL_CHECKS.reduce(
            (acc, label, i) => ({ ...acc, [label]: postInstallChecks[i] }),
            {}
          ),
          actualHours: parseFloat(installActualHours) || 0,
          installDate,
          installerSignature,
          timerSeconds,
          vinylConditionNotes,
          finalNotes: installFinalNotes,
        }
        break

      case 'prod_review':
        notes = qcNotes
        checklistData = {
          qcResult,
          finalLinearFt: parseFloat(qcFinalLinFt) || 0,
          reprintCost: parseFloat(qcReprintCost) || 0,
          qcNotes,
        }
        break

      case 'sales_close':
        notes = salesCloseNotes
        checklistData = {
          salePrice,
          reprintCost,
          adjProfit,
          adjGpm,
          salesCloseNotes,
        }
        break
    }

    // Insert approval
    await supabase.from('stage_approvals').insert({
      project_id: project.id,
      org_id: project.org_id,
      stage,
      approved_by: profile.id,
      notes: notes || null,
      checklist: checklistData,
    })

    // Update project
    const updatePayload: any = {
      pipe_stage: next === 'done' ? 'done' : next,
      updated_at: new Date().toISOString(),
    }

    // Merge stage data into form_data
    const mergedFormData = {
      ...(project.form_data || {}),
      [`${stage}_signoff`]: checklistData,
    }
    updatePayload.form_data = mergedFormData

    if (next === 'done') {
      updatePayload.status = 'closed'
    }

    await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', project.id)

    // Refresh approvals
    setApprovals((prev) => ({
      ...prev,
      [stage]: {
        stage,
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
        checklist: checklistData,
      },
    }))

    const updatedProject = {
      ...project,
      pipe_stage: next === 'done' ? 'done' : next,
      status: next === 'done' ? 'closed' : project.status,
      form_data: mergedFormData,
    }

    setSuccessMsg(
      `${STAGE_META[stage].label} signed off successfully!`
    )

    // Auto-advance tab
    if (next !== 'done' && PIPE_STAGES.includes(next as PipeStage)) {
      setActiveTab(next as PipeStage)
    }

    setSaving(false)
    onUpdate(updatedProject)
  }

  // ── Send back handler ────────────────────────────────────────────────────────
  const handleSendBack = async () => {
    if (!sendBackReason) return
    setSendingBack(true)

    const fromStage = activeTab
    const toStage = prevStage(fromStage)

    await supabase.from('send_backs').insert({
      project_id: project.id,
      org_id: project.org_id,
      from_stage: fromStage,
      to_stage: toStage,
      reason: sendBackReason,
      notes: sendBackNotes || null,
      created_by: profile.id,
    })

    await supabase
      .from('projects')
      .update({
        pipe_stage: toStage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    const updatedProject = {
      ...project,
      pipe_stage: toStage,
    }

    setSendingBack(false)
    setShowSendBack(false)
    setSendBackReason('')
    setSendBackNotes('')
    setActiveTab(toStage as PipeStage)
    onUpdate(updatedProject)
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const currentPipeStage = project.pipe_stage as string
  const currentIdx = stageIndex(currentPipeStage)

  const isStageCompleted = (stage: PipeStage): boolean => {
    return !!approvals[stage]?.approved_at || approvals[stage]?.status === 'approved'
  }

  const isCurrentStage = (stage: PipeStage): boolean => {
    return stageIndex(stage) === currentIdx
  }

  const allPreInstallChecked = preInstallChecks.every(Boolean)
  const allPostInstallChecked = postInstallChecks.every(Boolean)

  // ── Shared input style ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--surface2)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--text1)',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const inputFocusStyle = '1px solid var(--accent)'

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 800,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '.06em',
    marginBottom: 6,
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 900,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
    marginBottom: 12,
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderMetricPills = () => {
    const pills = [
      { label: 'SALE', value: fM(salePrice), color: '#22c07a' },
      { label: 'PROFIT', value: fM(profit), color: '#22c07a' },
      { label: 'GPM', value: fP(gpm), color: '#22d3ee' },
      { label: 'INSTALL PAY', value: fM(installPay), color: '#f25a5a' },
      { label: 'HRS BUDGET', value: String(hrsBudget), color: '#9299b5' },
    ]

    return (
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 24px',
          borderBottom: '1px solid var(--surface2)',
          flexWrap: 'wrap',
        }}
      >
        {pills.map((pill) => (
          <div
            key={pill.label}
            style={{
              flex: 1,
              minWidth: 100,
              background: `${pill.color}12`,
              border: `1px solid ${pill.color}30`,
              borderRadius: 10,
              padding: '8px 12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                color: pill.color,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                marginBottom: 2,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              {pill.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: pill.color,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {pill.value}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderStageTabs = () => {
    return (
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--surface2)',
        }}
      >
        {PIPE_STAGES.map((stage) => {
          const meta = STAGE_META[stage]
          const Icon = meta.icon
          const completed = isStageCompleted(stage)
          const isCurrent = isCurrentStage(stage)
          const isActive = activeTab === stage
          const sIdx = stageIndex(stage)

          let statusColor = 'var(--text3)'
          if (completed) statusColor = '#22c07a'
          else if (isCurrent) statusColor = meta.color

          return (
            <button
              key={stage}
              onClick={() => setActiveTab(stage)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '12px 8px',
                background: isActive
                  ? `${meta.color}10`
                  : 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? `3px solid ${meta.color}`
                  : '3px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ position: 'relative' }}>
                {completed ? (
                  <CheckCircle2
                    size={20}
                    color="#22c07a"
                    strokeWidth={2.5}
                  />
                ) : isCurrent ? (
                  <Icon
                    size={20}
                    color={meta.color}
                    strokeWidth={2.5}
                  />
                ) : (
                  <Circle
                    size={20}
                    color="var(--text3)"
                    strokeWidth={1.5}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: isActive
                    ? meta.color
                    : completed
                    ? '#22c07a'
                    : isCurrent
                    ? meta.color
                    : 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}
              >
                {meta.label}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderCurrentBadge = (stage: PipeStage) => {
    if (!isCurrentStage(stage)) return null
    const meta = STAGE_META[stage]
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 14px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 800,
          background: `${meta.color}18`,
          color: meta.color,
          border: `1px solid ${meta.color}40`,
        }}
      >
        <Clock size={12} />
        CURRENT STAGE
      </div>
    )
  }

  const renderSignOffButton = (
    stage: PipeStage,
    disabled: boolean,
    extraLabel?: string
  ) => {
    const meta = STAGE_META[stage]
    return (
      <button
        onClick={() => handleSignOff(stage)}
        disabled={disabled || saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 28px',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 14,
          cursor: disabled || saving ? 'not-allowed' : 'pointer',
          border: 'none',
          background:
            disabled || saving
              ? 'var(--surface2)'
              : stage === 'sales_close'
              ? '#8b5cf6'
              : '#22c07a',
          color: disabled || saving ? 'var(--text3)' : '#fff',
          opacity: saving ? 0.6 : 1,
          boxShadow:
            disabled || saving
              ? 'none'
              : `0 4px 16px ${
                  stage === 'sales_close' ? '#8b5cf640' : '#22c07a40'
                }`,
          fontFamily: 'Barlow Condensed, sans-serif',
        }}
      >
        <Check size={16} />
        {saving
          ? 'Signing off...'
          : `Sign Off -- ${extraLabel || meta.label}`}
      </button>
    )
  }

  const renderSendBackButton = (stage: PipeStage) => {
    if (stageIndex(stage) === 0) return null
    return (
      <button
        onClick={() => {
          setShowSendBack(true)
          setSendBackReason('')
          setSendBackNotes('')
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 20px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          color: '#f59e0b',
          fontFamily: 'Barlow Condensed, sans-serif',
        }}
      >
        <Undo2 size={14} />
        Send Back
      </button>
    )
  }

  const renderSendBackUI = () => {
    if (!showSendBack) return null
    const reasons = SEND_BACK_REASONS[activeTab] || ['Other']
    const target = prevStage(activeTab)
    const targetLabel =
      STAGE_META[target as PipeStage]?.label || target

    return (
      <div
        style={{
          marginTop: 16,
          padding: 20,
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.20)',
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            <ArrowLeft size={16} />
            Send Back to {targetLabel}
          </div>
          <button
            onClick={() => setShowSendBack(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ ...sectionLabelStyle, marginBottom: 10 }}>
          Select Reason
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => setSendBackReason(reason)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                border: '2px solid',
                background:
                  sendBackReason === reason
                    ? 'rgba(245,158,11,0.15)'
                    : 'var(--surface2)',
                borderColor:
                  sendBackReason === reason
                    ? '#f59e0b'
                    : 'var(--surface2)',
                color:
                  sendBackReason === reason
                    ? '#f59e0b'
                    : 'var(--text2)',
              }}
            >
              {reason}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={sendBackNotes}
            onChange={(e) => setSendBackNotes(e.target.value)}
            rows={3}
            placeholder="Additional details about the send-back..."
            style={{
              ...inputStyle,
              resize: 'none' as const,
            }}
          />
        </div>

        <button
          onClick={handleSendBack}
          disabled={!sendBackReason || sendingBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 14,
            cursor:
              !sendBackReason || sendingBack
                ? 'not-allowed'
                : 'pointer',
            border: 'none',
            background: '#f59e0b',
            color: '#0d0f14',
            opacity: !sendBackReason || sendingBack ? 0.5 : 1,
            fontFamily: 'Barlow Condensed, sans-serif',
          }}
        >
          <Undo2 size={14} />
          {sendingBack
            ? 'Sending back...'
            : `Confirm Send Back`}
        </button>
      </div>
    )
  }

  // ── Stage content renderers ──────────────────────────────────────────────────

  const renderSalesIntake = () => {
    const stage: PipeStage = 'sales_in'
    const completed = isStageCompleted(stage)

    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--text1)',
                marginBottom: 4,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              Sales Intake
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Sales rep reviews job, confirms scope & pricing, sends to
              production
            </div>
          </div>
          {renderCurrentBadge(stage)}
        </div>

        {completed && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              background: 'rgba(34,192,122,0.06)',
              border: '1px solid rgba(34,192,122,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color="#22c07a" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#22c07a',
              }}
            >
              Sales Intake has been signed off
            </span>
          </div>
        )}

        {!completed && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            {renderSignOffButton(stage, false, 'Sales Intake')}
            {renderSendBackButton(stage)}
          </div>
        )}

        {renderSendBackUI()}
      </div>
    )
  }

  const renderProduction = () => {
    const stage: PipeStage = 'production'
    const completed = isStageCompleted(stage)
    const canSignOff = parseFloat(prodLinFtPrinted) > 0

    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--text1)',
                marginBottom: 4,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              Production
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Print, laminate, cut all panels. Log linear feet printed.
              Confirm material.
            </div>
          </div>
          {renderCurrentBadge(stage)}
        </div>

        {completed && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              background: 'rgba(34,192,122,0.06)',
              border: '1px solid rgba(34,192,122,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color="#22c07a" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#22c07a',
              }}
            >
              Production has been signed off
            </span>
          </div>
        )}

        {!completed && (
          <>
            {/* Material Log Section */}
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={sectionLabelStyle}>
                Material Log
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Linear Feet Printed *
                  </label>
                  <input
                    type="number"
                    value={prodLinFtPrinted}
                    onChange={(e) =>
                      setProdLinFtPrinted(e.target.value)
                    }
                    placeholder="0"
                    style={{
                      ...inputStyle,
                      fontFamily: 'JetBrains Mono, monospace',
                      borderColor:
                        prodLinFtPrinted === ''
                          ? 'rgba(245,158,11,0.4)'
                          : 'var(--surface2)',
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Material Width (in)
                  </label>
                  <input
                    type="number"
                    value={prodMaterialWidth}
                    onChange={(e) =>
                      setProdMaterialWidth(e.target.value)
                    }
                    style={{
                      ...inputStyle,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Rolls / Sheets Used
                  </label>
                  <input
                    type="number"
                    value={prodRollsUsed}
                    onChange={(e) =>
                      setProdRollsUsed(e.target.value)
                    }
                    placeholder="0"
                    style={{
                      ...inputStyle,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Material Type / SKU
                  </label>
                  <input
                    type="text"
                    value={prodMaterialType}
                    onChange={(e) =>
                      setProdMaterialType(e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Print Notes</label>
                <textarea
                  value={prodPrintNotes}
                  onChange={(e) =>
                    setProdPrintNotes(e.target.value)
                  }
                  rows={3}
                  placeholder="Any notes about the print run..."
                  style={{
                    ...inputStyle,
                    resize: 'none' as const,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {renderSignOffButton(
                stage,
                !canSignOff,
                'Production'
              )}
              {renderSendBackButton(stage)}
            </div>

            {!canSignOff && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: '#f59e0b',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={14} />
                Linear Feet Printed is required before signing off
              </div>
            )}
          </>
        )}

        {renderSendBackUI()}
      </div>
    )
  }

  const renderInstall = () => {
    const stage: PipeStage = 'install'
    const completed = isStageCompleted(stage)

    const canAcceptVinyl = allPreInstallChecked
    const canSignOff =
      installFinished &&
      allPostInstallChecked &&
      installActualHours !== '' &&
      installerSignature.trim() !== ''

    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--text1)',
                marginBottom: 4,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              Install
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Installer wraps vehicle, logs actual hours & notes,
              signs off on work.
            </div>
          </div>
          {renderCurrentBadge(stage)}
        </div>

        {completed && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              background: 'rgba(34,192,122,0.06)',
              border: '1px solid rgba(34,192,122,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color="#22c07a" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#22c07a',
              }}
            >
              Install has been signed off
            </span>
          </div>
        )}

        {!completed && (
          <>
            {/* Pre-Install Vinyl Check */}
            {!vinylAccepted && (
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <div style={sectionLabelStyle}>
                  Pre-Install Vinyl Check
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {PRE_INSTALL_CHECKS.map((label, i) => (
                    <label
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: preInstallChecks[i]
                          ? 'rgba(34,192,122,0.06)'
                          : 'rgba(26,29,39,0.5)',
                        border: `1px solid ${
                          preInstallChecks[i]
                            ? 'rgba(34,192,122,0.2)'
                            : 'var(--surface2)'
                        }`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={preInstallChecks[i]}
                        onChange={() => {
                          const next = [...preInstallChecks]
                          next[i] = !next[i]
                          setPreInstallChecks(next)
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: '#22c07a',
                          cursor: 'pointer',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: preInstallChecks[i]
                            ? '#22c07a'
                            : 'var(--text2)',
                        }}
                      >
                        {label}
                      </span>
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    Vinyl Condition Notes
                  </label>
                  <textarea
                    value={vinylConditionNotes}
                    onChange={(e) =>
                      setVinylConditionNotes(e.target.value)
                    }
                    rows={2}
                    placeholder="Note any issues with vinyl condition..."
                    style={{
                      ...inputStyle,
                      resize: 'none' as const,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => {
                      setVinylAccepted(true)
                      startTimer()
                    }}
                    disabled={!canAcceptVinyl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 24px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: canAcceptVinyl
                        ? 'pointer'
                        : 'not-allowed',
                      border: 'none',
                      background: canAcceptVinyl
                        ? '#22c07a'
                        : 'var(--surface2)',
                      color: canAcceptVinyl
                        ? '#fff'
                        : 'var(--text3)',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}
                  >
                    <Check size={16} />
                    Accept Vinyl -- Start Install
                  </button>

                  <button
                    onClick={() => {
                      setShowSendBack(true)
                      setSendBackReason('')
                      setSendBackNotes('')
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 20px',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: 'rgba(242,90,90,0.08)',
                      border: '1px solid rgba(242,90,90,0.25)',
                      color: '#f25a5a',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}
                  >
                    <Undo2 size={14} />
                    Reject -- Send Back to Production
                  </button>
                </div>

                {!canAcceptVinyl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 12,
                      color: '#f59e0b',
                      fontWeight: 600,
                    }}
                  >
                    <AlertTriangle size={14} />
                    All 4 vinyl checks are required before accepting
                  </div>
                )}
              </div>
            )}

            {/* Install Timer */}
            {vinylAccepted && !installFinished && (
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                <div style={sectionLabelStyle}>
                  Install Timer
                </div>

                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 48,
                    fontWeight: 700,
                    color: '#22d3ee',
                    letterSpacing: 2,
                    marginBottom: 8,
                    textShadow: timerRunning
                      ? '0 0 20px rgba(34,211,238,0.3)'
                      : 'none',
                  }}
                >
                  {formatTimer(timerSeconds)}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text3)',
                    marginBottom: 16,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {(timerSeconds / 3600).toFixed(2)} hours
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'center',
                  }}
                >
                  {timerRunning ? (
                    <button
                      onClick={pauseTimer}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 28px',
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        border: 'none',
                        background: '#f25a5a',
                        color: '#fff',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}
                    >
                      <Pause size={16} />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 28px',
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        border: 'none',
                        background: '#22c07a',
                        color: '#fff',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}
                    >
                      <Play size={16} />
                      Resume
                    </button>
                  )}

                  <button
                    onClick={finishWrap}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 28px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer',
                      border: 'none',
                      background: '#22c07a',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(34,192,122,0.3)',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}
                  >
                    <Square size={16} />
                    Finish Wrap
                  </button>
                </div>
              </div>
            )}

            {/* Post-Install Verification */}
            {installFinished && (
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <div style={sectionLabelStyle}>
                  Post-Install Verification
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {POST_INSTALL_CHECKS.map((label, i) => (
                    <label
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: postInstallChecks[i]
                          ? 'rgba(34,192,122,0.06)'
                          : 'rgba(26,29,39,0.5)',
                        border: `1px solid ${
                          postInstallChecks[i]
                            ? 'rgba(34,192,122,0.2)'
                            : 'var(--surface2)'
                        }`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={postInstallChecks[i]}
                        onChange={() => {
                          const next = [...postInstallChecks]
                          next[i] = !next[i]
                          setPostInstallChecks(next)
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: '#22c07a',
                          cursor: 'pointer',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: postInstallChecks[i]
                            ? '#22c07a'
                            : 'var(--text2)',
                        }}
                      >
                        {label}
                      </span>
                    </label>
                  ))}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Actual Hours
                    </label>
                    <input
                      type="number"
                      value={installActualHours}
                      onChange={(e) =>
                        setInstallActualHours(e.target.value)
                      }
                      placeholder="0"
                      style={{
                        ...inputStyle,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Install Date
                    </label>
                    <input
                      type="date"
                      value={installDate}
                      onChange={(e) =>
                        setInstallDate(e.target.value)
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Installer Signature
                    </label>
                    <input
                      type="text"
                      value={installerSignature}
                      onChange={(e) =>
                        setInstallerSignature(e.target.value)
                      }
                      placeholder="Full name"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Final Notes / Any Issues
                  </label>
                  <textarea
                    value={installFinalNotes}
                    onChange={(e) =>
                      setInstallFinalNotes(e.target.value)
                    }
                    rows={3}
                    placeholder="Any issues, notes, or observations..."
                    style={{
                      ...inputStyle,
                      resize: 'none' as const,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sign off buttons - only after install is finished */}
            {installFinished && (
              <>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  {renderSignOffButton(
                    stage,
                    !canSignOff,
                    'Install'
                  )}
                  {renderSendBackButton(stage)}
                </div>

                {!canSignOff && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 12,
                      color: '#f59e0b',
                      fontWeight: 600,
                    }}
                  >
                    <AlertTriangle size={14} />
                    Complete all post-install checks, hours, and
                    signature to sign off
                  </div>
                )}
              </>
            )}
          </>
        )}

        {renderSendBackUI()}
      </div>
    )
  }

  const renderProdReview = () => {
    const stage: PipeStage = 'prod_review'
    const completed = isStageCompleted(stage)
    const canSignOff = qcResult !== ''

    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--text1)',
                marginBottom: 4,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              QC Review
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              QC check wrap quality. Update actual material used.
              Note any reprints.
            </div>
          </div>
          {renderCurrentBadge(stage)}
        </div>

        {completed && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              background: 'rgba(34,192,122,0.06)',
              border: '1px solid rgba(34,192,122,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color="#22c07a" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#22c07a',
              }}
            >
              Production QC has been signed off
            </span>
          </div>
        )}

        {!completed && (
          <>
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={sectionLabelStyle}>QC Review</div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>QC Pass?</label>
                <select
                  value={qcResult}
                  onChange={(e) => setQcResult(e.target.value)}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    appearance: 'auto' as const,
                  }}
                >
                  <option value="Pass -- Ship">
                    Pass -- Ship
                  </option>
                  <option value="Reprint -- Full">
                    Reprint -- Full
                  </option>
                  <option value="Reprint -- Partial">
                    Reprint -- Partial
                  </option>
                  <option value="Fix -- Touch Up">
                    Fix -- Touch Up
                  </option>
                </select>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Final Linear Feet (Actual)
                  </label>
                  <input
                    type="number"
                    value={qcFinalLinFt}
                    onChange={(e) =>
                      setQcFinalLinFt(e.target.value)
                    }
                    placeholder="0"
                    style={{
                      ...inputStyle,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Reprint Cost (If Any)
                  </label>
                  <input
                    type="number"
                    value={qcReprintCost}
                    onChange={(e) =>
                      setQcReprintCost(e.target.value)
                    }
                    placeholder="$0"
                    style={{
                      ...inputStyle,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>QC Notes</label>
                <textarea
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  rows={3}
                  placeholder="Any quality observations, issues found, or notes..."
                  style={{
                    ...inputStyle,
                    resize: 'none' as const,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {renderSignOffButton(
                stage,
                !canSignOff,
                'Production QC'
              )}
              {renderSendBackButton(stage)}
            </div>
          </>
        )}

        {renderSendBackUI()}
      </div>
    )
  }

  const renderSalesClose = () => {
    const stage: PipeStage = 'sales_close'
    const completed = isStageCompleted(stage)

    const metricCards = [
      {
        label: 'Sale Price',
        value: fM(salePrice),
        borderColor: '#22c07a',
        valueColor: '#22c07a',
      },
      {
        label: 'Reprint Deduct',
        value: reprintCost > 0 ? `-${fM(reprintCost)}` : fM(0),
        borderColor: '#f25a5a',
        valueColor: reprintCost > 0 ? '#f25a5a' : 'var(--text3)',
      },
      {
        label: 'Adj Profit',
        value: fM(adjProfit),
        borderColor: '#22c07a',
        valueColor: adjProfit >= 0 ? '#22c07a' : '#f25a5a',
      },
      {
        label: 'Adj GPM',
        value: fP(adjGpm),
        borderColor: '#22d3ee',
        valueColor:
          adjGpm >= 70
            ? '#22c07a'
            : adjGpm >= 55
            ? '#f59e0b'
            : '#f25a5a',
      },
    ]

    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--text1)',
                marginBottom: 4,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              Sales Approval
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Review final numbers. Approve GPM. Lock commissions.
              Close job.
            </div>
          </div>
          {renderCurrentBadge(stage)}
        </div>

        {completed && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              background: 'rgba(34,192,122,0.06)',
              border: '1px solid rgba(34,192,122,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color="#22c07a" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#22c07a',
              }}
            >
              Sales Approval has been signed off -- Job Closed
            </span>
          </div>
        )}

        {!completed && (
          <>
            {/* Final Numbers Review */}
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={sectionLabelStyle}>
                Final Numbers Review
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {metricCards.map((card) => (
                  <div
                    key={card.label}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 10,
                      background: 'rgba(13,15,20,0.5)',
                      borderLeft: `3px solid ${card.borderColor}`,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: 'var(--text3)',
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        marginBottom: 6,
                        fontFamily:
                          'Barlow Condensed, sans-serif',
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: card.valueColor,
                        fontFamily:
                          'JetBrains Mono, monospace',
                      }}
                    >
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {reprintCost <= 0 ? (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(34,192,122,0.06)',
                    border: '1px solid rgba(34,192,122,0.15)',
                    fontSize: 13,
                    color: '#22c07a',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={14} />
                  No reprints -- full profit stands
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(242,90,90,0.06)',
                    border: '1px solid rgba(242,90,90,0.15)',
                    fontSize: 13,
                    color: '#f25a5a',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={14} />
                  Reprint deduction: {fM(reprintCost)}.
                  Original profit {fM(profit)} adjusted to{' '}
                  {fM(adjProfit)} (GPM {fP(gpm)} to{' '}
                  {fP(adjGpm)})
                </div>
              )}
            </div>

            {/* Sales Manager Sign-off Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                Sales Manager Sign-Off Notes
              </label>
              <textarea
                value={salesCloseNotes}
                onChange={(e) =>
                  setSalesCloseNotes(e.target.value)
                }
                rows={3}
                placeholder="Any final notes before closing the job..."
                style={{
                  ...inputStyle,
                  resize: 'none' as const,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {renderSignOffButton(
                stage,
                false,
                'Sales Approval'
              )}
              {renderSendBackButton(stage)}
            </div>
          </>
        )}

        {renderSendBackUI()}
      </div>
    )
  }

  // ── Tab content router ───────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales_in':
        return renderSalesIntake()
      case 'production':
        return renderProduction()
      case 'install':
        return renderInstall()
      case 'prod_review':
        return renderProdReview()
      case 'sales_close':
        return renderSalesClose()
      default:
        return null
    }
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 768,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--surface2)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid var(--surface2)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: 'var(--text1)',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              Approval Process
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text3)',
                marginTop: 2,
              }}
            >
              {project.title || 'Untitled Job'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Metric pills */}
        {renderMetricPills()}

        {/* Stage tabs */}
        {renderStageTabs()}

        {/* Success message */}
        {successMsg && (
          <div
            style={{
              margin: '12px 24px 0',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(34,192,122,0.08)',
              border: '1px solid rgba(34,192,122,0.2)',
              fontSize: 13,
              fontWeight: 700,
              color: '#22c07a',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} />
            {successMsg}
          </div>
        )}

        {/* Tab content */}
        <div style={{ flex: 1 }}>{renderTabContent()}</div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--surface2)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              background: 'var(--surface2)',
              border: '1px solid var(--surface2)',
              color: 'var(--text2)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            <X size={14} />
            Close
          </button>

          <button
            onClick={() =>
              router.push(`/projects/${project.id}/edit`)
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              background: 'rgba(79,127,255,0.08)',
              border: '1px solid rgba(79,127,255,0.25)',
              color: '#4f7fff',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            <Clipboard size={14} />
            Edit Order
          </button>
        </div>
      </div>
    </div>
  )
}
