'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Package, CheckSquare, Image, StickyNote, Link2, Mail,
  Palette, Clock, ChevronDown, ChevronUp, Upload, MessageSquare,
  Send, FileText, Eye, CheckCircle2, XCircle, RotateCcw,
  DollarSign, Wrench, User, Layers, AlertTriangle, type LucideIcon,
} from 'lucide-react'
import type { Profile, PipeStage } from '@/types'
import ActivityLog from '@/components/activity/ActivityLog'
import type { ActivityEntry } from '@/components/activity/ActivityLog'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface JobDetailTabsProps {
  profile: Profile
  project: any
  lineItems: any[]
  activities: any[]
}

type TabKey = 'items' | 'tasks' | 'assets' | 'notes' | 'related' | 'emails' | 'design' | 'activity'

interface TabDef {
  key: TabKey
  label: string
  Icon: LucideIcon
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const TABS: TabDef[] = [
  { key: 'items',    label: 'Items',        Icon: Package },
  { key: 'tasks',    label: 'Tasks',        Icon: CheckSquare },
  { key: 'assets',   label: 'Assets',       Icon: Image },
  { key: 'notes',    label: 'Notes',        Icon: StickyNote },
  { key: 'related',  label: 'Related',      Icon: Link2 },
  { key: 'emails',   label: 'Emails',       Icon: Mail },
  { key: 'design',   label: 'Design',       Icon: Palette },
  { key: 'activity', label: 'Activity Log', Icon: Clock },
]

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  sales_in:    { label: 'Sales Intake',  color: 'var(--accent)' },
  production:  { label: 'Production',    color: 'var(--green)' },
  install:     { label: 'Install',       color: 'var(--cyan)' },
  prod_review: { label: 'QC Review',     color: 'var(--amber)' },
  sales_close: { label: 'Sales Close',   color: 'var(--purple)' },
  done:        { label: 'Complete',      color: 'var(--green)' },
}

const STAGE_ORDER: PipeStage[] = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtPct = (n: number) => `${Math.round(n)}%`

// ─── Demo Data ──────────────────────────────────────────────────────────────────
const DEMO_LINE_ITEMS = [
  {
    id: 'dli-1',
    product_type: 'wrap',
    name: 'Full Body Wrap - Matte Black',
    description: '2024 Ford F-150 XLT, 3M 2080 Matte Black',
    category: 'Wrap',
    quantity: 1,
    unit_price: 2800,
    total_price: 2800,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', wrapType: 'Full Wrap', vinylType: '3M 2080 Matte Black',
      materialCost: 850, laborCost: 480, laborPrice: 600, machineCost: 150,
      designDetails: 'Chrome delete + debadge',
    },
    financials: {
      sale: 2800, material: 850, installHours: 16, installRate: 30,
      design: 150, misc: 50, cogs: 1530, gp: 1270, gpm: 45.4, commission: 280,
    },
  },
  {
    id: 'dli-2',
    product_type: 'ppf',
    name: 'PPF - Full Front End',
    description: '2024 Ford F-150 XLT, XPEL Ultimate Plus',
    category: 'PPF',
    quantity: 1,
    unit_price: 1650,
    total_price: 1650,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', wrapType: 'Paint Protection Film', vinylType: 'XPEL Ultimate Plus',
      materialCost: 480, laborCost: 210, laborPrice: 300, machineCost: 120,
    },
    financials: {
      sale: 1650, material: 480, installHours: 7, installRate: 30,
      design: 0, misc: 30, cogs: 720, gp: 930, gpm: 56.4, commission: 165,
    },
  },
]

const DEMO_NOTES = [
  {
    id: 'n1', author: 'Kevin', initial: 'K',
    content: 'Customer wants chrome delete on all trim pieces. Confirmed matte black 3M 2080 is in stock.',
    created_at: '2026-02-21T10:30:00Z',
  },
  {
    id: 'n2', author: 'Marcus', initial: 'M',
    content: 'Checked the truck on intake. Small dent on driver fender. Took photos for documentation.',
    created_at: '2026-02-21T14:15:00Z',
  },
  {
    id: 'n3', author: 'Tyler', initial: 'T',
    content: 'Customer approved proof v2. Ready for print queue. Using bay 2 for this install.',
    created_at: '2026-02-22T16:30:00Z',
  },
]

const DEMO_DESIGN_VERSIONS = [
  {
    id: 'dv-1', version: 1, status: 'revision' as const,
    file_name: 'ford-f150-proof-v1.pdf', designer: 'Alex',
    feedback: 'Customer: "Make logo bigger on the doors"',
    created_at: '2026-02-21T14:00:00Z',
  },
  {
    id: 'dv-2', version: 2, status: 'approved' as const,
    file_name: 'ford-f150-proof-v2.pdf', designer: 'Alex',
    feedback: 'Customer approved with digital signature',
    created_at: '2026-02-22T15:00:00Z',
  },
]

const DEMO_PROJECT = {
  id: 'demo-job-1',
  title: 'Ford F-150 Matte Black Full Wrap',
  pipe_stage: 'production' as PipeStage,
  due_date: '2026-03-03',
  form_data: { client: 'Bob\'s Pizza', vehicle: '2024 Ford F-150 XLT' },
  agent: { id: 'a1', name: 'Kevin Wright', email: 'kevin@usawrapco.com' },
  installer: { id: 'i1', name: 'Marcus Bell', email: 'marcus@usawrapco.com' },
  customer: { id: 'c1', name: 'Bob Johnson', email: 'bob@pizza.com' },
  revenue: 4450,
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function JobDetailTabs({ profile, project: rawProject, lineItems: rawLineItems, activities: rawActivities }: JobDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('items')
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const project = rawProject || DEMO_PROJECT
  const lineItems = rawLineItems?.length > 0 ? rawLineItems : DEMO_LINE_ITEMS
  const activities: ActivityEntry[] = rawActivities?.length > 0 ? rawActivities : []
  const isDemo = !rawProject

  const jobNumber = project.id?.startsWith('demo') ? '1001' : project.id?.slice(0, 6)?.toUpperCase()
  const stageConfig = STAGE_CONFIG[project.pipe_stage] || STAGE_CONFIG.sales_in
  const customerName = project.customer?.name || (project.form_data as any)?.client || 'Walk-in'
  const agentName = project.agent?.name || 'Unassigned'
  const installerName = project.installer?.name || 'Unassigned'
  const dueDate = project.due_date
    ? new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD'

  // ─── Styles ────────────────────────────────────────────────────────────
  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
  }

  const backLinkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text3)',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    marginBottom: 16,
    cursor: 'pointer',
    transition: 'color 0.15s',
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: 20,
    padding: '20px 24px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 24,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text1)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  }

  const jobNumStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontFeatureSettings: '"tnum"',
    fontSize: 22,
    color: 'var(--accent)',
  }

  const metaRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    marginTop: 10,
    fontSize: 13,
    color: 'var(--text2)',
  }

  const metaItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  }

  const metaLabelStyle: React.CSSProperties = {
    color: 'var(--text3)',
    fontWeight: 500,
  }

  const stageBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "'Barlow Condensed', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: stageConfig.color,
    background: `${stageConfig.color}18`,
    border: `1px solid ${stageConfig.color}30`,
    cursor: 'pointer',
    position: 'relative',
  }

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 0,
    borderBottom: '2px solid var(--border)',
    marginBottom: 24,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  }

  const contentStyle: React.CSSProperties = {
    padding: '0 4px',
    minHeight: 300,
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div style={wrapperStyle}>
      {/* Back Link */}
      <Link href="/pipeline" style={backLinkStyle}>
        <ArrowLeft style={{ width: 15, height: 15 }} />
        Back to Jobs
      </Link>

      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <span style={jobNumStyle}>JB #{jobNumber}</span>
          <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 20 }}>&mdash;</span>
          {project.title || 'Untitled Job'}
        </h1>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}>
            <span style={metaLabelStyle}>Customer:</span> {customerName}
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={metaItemStyle}>
            <span style={metaLabelStyle}>Sales:</span> {agentName}
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={metaItemStyle}>
            <span style={metaLabelStyle}>Installer:</span> {installerName}
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={metaItemStyle}>
            <span style={metaLabelStyle}>Due:</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontFeatureSettings: '"tnum"' }}>
              {dueDate}
            </span>
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>

          {/* Stage Badge w/ Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <span style={metaItemStyle}>
              <span style={metaLabelStyle}>Status:</span>
              <button
                onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                style={{
                  ...stageBadgeStyle,
                  display: 'inline-flex',
                  border: `1px solid ${stageConfig.color}30`,
                }}
              >
                {stageConfig.label}
                <ChevronDown style={{ width: 12, height: 12 }} />
              </button>
            </span>
            {stageDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 50,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 4,
                  minWidth: 160,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                {STAGE_ORDER.map((stg) => {
                  const cfg = STAGE_CONFIG[stg]
                  const isActive = project.pipe_stage === stg
                  return (
                    <button
                      key={stg}
                      onClick={() => setStageDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: isActive ? `${cfg.color}18` : 'transparent',
                        color: isActive ? cfg.color : 'var(--text2)',
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: cfg.color,
                          flexShrink: 0,
                        }}
                      />
                      {cfg.label}
                      {isActive && <CheckCircle2 style={{ width: 13, height: 13, marginLeft: 'auto' }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Banner */}
      {isDemo && (
        <div
          style={{
            padding: '8px 14px',
            marginBottom: 16,
            borderRadius: 6,
            background: 'rgba(79,127,255,0.08)',
            border: '1px solid rgba(79,127,255,0.2)',
            color: 'var(--text2)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Eye style={{ width: 13, height: 13, color: 'var(--accent)' }} />
          Viewing demo job. Data shown is for demonstration only.
        </div>
      )}

      {/* Tab Bar */}
      <div style={tabBarStyle}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -2,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <t.Icon style={{ width: 14, height: 14 }} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div style={contentStyle}>
        {activeTab === 'items' && <ItemsTab lineItems={lineItems} />}
        {activeTab === 'tasks' && <PlaceholderTab icon={CheckSquare} label="Tasks" />}
        {activeTab === 'assets' && <PlaceholderTab icon={Image} label="Assets" />}
        {activeTab === 'notes' && <NotesTab />}
        {activeTab === 'related' && <PlaceholderTab icon={Link2} label="Related" />}
        {activeTab === 'emails' && <PlaceholderTab icon={Mail} label="Emails" />}
        {activeTab === 'design' && <DesignTab project={project} />}
        {activeTab === 'activity' && <ActivityTab activities={activities} />}
      </div>
    </div>
  )
}

// ─── Items Tab ──────────────────────────────────────────────────────────────────
function ItemsTab({ lineItems }: { lineItems: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sectionHeader: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text2)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  return (
    <div>
      <div style={sectionHeader}>
        <Package style={{ width: 14, height: 14 }} />
        Line Items
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontFeatureSettings: '"tnum"',
            fontSize: 11,
            color: 'var(--text3)',
            fontWeight: 500,
          }}
        >
          ({lineItems.length})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lineItems.map((item) => {
          const isExpanded = expandedId === item.id
          const fin = item.financials || {}
          const hasFinancials = fin.sale > 0
          const gpmColor = (fin.gpm || 0) >= 50 ? 'var(--green)' : (fin.gpm || 0) >= 35 ? 'var(--amber)' : 'var(--red)'

          return (
            <div
              key={item.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* Item Header Row */}
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: hasFinancials ? 'pointer' : 'default',
                }}
                onClick={() => hasFinancials && setExpandedId(isExpanded ? null : item.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: item.category === 'PPF' || item.product_type === 'ppf'
                          ? 'rgba(139,92,246,0.15)'
                          : 'rgba(79,127,255,0.15)',
                        color: item.category === 'PPF' || item.product_type === 'ppf'
                          ? 'var(--purple)'
                          : 'var(--accent)',
                      }}
                    >
                      {item.category || item.product_type || 'Wrap'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {item.description}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 1 }}>Qty</div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontFeatureSettings: '"tnum"',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text1)',
                      }}
                    >
                      {item.quantity}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 1 }}>Unit Price</div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontFeatureSettings: '"tnum"',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text1)',
                      }}
                    >
                      {fmtCurrency(item.unit_price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 1 }}>Total</div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontFeatureSettings: '"tnum"',
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--accent)',
                      }}
                    >
                      {fmtCurrency(item.total_price)}
                    </div>
                  </div>
                  {hasFinancials && (
                    <div style={{ color: 'var(--text3)', marginLeft: 4 }}>
                      {isExpanded ? (
                        <ChevronUp style={{ width: 16, height: 16 }} />
                      ) : (
                        <ChevronDown style={{ width: 16, height: 16 }} />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* GPM Pricing Engine (expanded) */}
              {isExpanded && hasFinancials && (
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text3)',
                      marginBottom: 12,
                    }}
                  >
                    GPM Pricing Engine
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 10,
                    }}
                  >
                    <FinCell label="Sale" value={fmtCurrency(fin.sale)} color="var(--text1)" />
                    <FinCell label="Material" value={fmtCurrency(fin.material)} color="var(--red)" />
                    <FinCell
                      label="Install"
                      value={`${fin.installHours}h x $${fin.installRate}/hr`}
                      color="var(--cyan)"
                    />
                    <FinCell label="Design" value={fmtCurrency(fin.design)} color="var(--purple)" />
                    <FinCell label="Misc" value={fmtCurrency(fin.misc)} color="var(--text3)" />
                    <FinCell label="COGS" value={fmtCurrency(fin.cogs)} color="var(--amber)" />
                    <FinCell label="Gross Profit" value={fmtCurrency(fin.gp)} color="var(--green)" />
                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>GPM</div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontFeatureSettings: '"tnum"',
                          fontSize: 16,
                          fontWeight: 700,
                          color: gpmColor,
                        }}
                      >
                        {fmtPct(fin.gpm)}
                      </div>
                    </div>
                    <FinCell label="Commission" value={fmtCurrency(fin.commission)} color="var(--accent)" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total Summary */}
      <div
        style={{
          marginTop: 16,
          padding: '12px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
          Job Total
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontFeatureSettings: '"tnum"',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text1)',
          }}
        >
          {fmtCurrency(lineItems.reduce((s, li) => s + (li.total_price || 0), 0))}
        </span>
      </div>
    </div>
  )
}

function FinCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 10px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontFeatureSettings: '"tnum"',
          fontSize: 13,
          fontWeight: 600,
          color,
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ─── Design Tab ─────────────────────────────────────────────────────────────────
function DesignTab({ project }: { project: any }) {
  const [dragOver, setDragOver] = useState(false)

  const sectionHeader: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text2)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const vehicle = project.form_data?.vehicle || project.vehicle_desc || 'N/A'
  const wrapType = project.form_data?.wrapDetail || project.form_data?.wrapType || 'Full Wrap'
  const material = project.form_data?.matRate ? `Vinyl @ $${project.form_data.matRate}/sqft` : '3M 2080 Matte Black'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Upload Zone */}
      <div>
        <div style={sectionHeader}>
          <Upload style={{ width: 14, height: 14 }} />
          Upload Design Files
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false) }}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '36px 24px',
            textAlign: 'center',
            background: dragOver ? 'rgba(79,127,255,0.05)' : 'transparent',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
        >
          <Upload
            style={{
              width: 32,
              height: 32,
              color: dragOver ? 'var(--accent)' : 'var(--text3)',
              marginBottom: 8,
            }}
          />
          <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>
            Drop files here or click to upload
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Supports AI, PSD, PDF, PNG, JPG (max 50MB)
          </div>
        </div>
      </div>

      {/* Design Brief */}
      <div>
        <div style={sectionHeader}>
          <FileText style={{ width: 14, height: 14 }} />
          Design Brief
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <BriefField label="Vehicle" value={vehicle} />
            <BriefField label="Wrap Type" value={wrapType} />
            <BriefField label="Material" value={material} />
          </div>
        </div>
      </div>

      {/* Revision Board */}
      <div>
        <div style={sectionHeader}>
          <Layers style={{ width: 14, height: 14 }} />
          Revision Board
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {DEMO_DESIGN_VERSIONS.map((v) => {
            const isApproved = v.status === 'approved'
            const statusColor = isApproved ? 'var(--green)' : 'var(--amber)'
            const statusLabel = isApproved ? 'Approved' : 'Revision Requested'
            const StatusIcon = isApproved ? CheckCircle2 : RotateCcw

            return (
              <div
                key={v.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isApproved ? 'rgba(34,192,122,0.3)' : 'var(--border)'}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {/* Preview placeholder */}
                <div
                  style={{
                    height: 120,
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <Palette style={{ width: 32, height: 32, color: 'var(--text3)', opacity: 0.4 }} />
                </div>
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text1)',
                      }}
                    >
                      v{v.version}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `${statusColor}18`,
                        color: statusColor,
                      }}
                    >
                      <StatusIcon style={{ width: 11, height: 11 }} />
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                    {v.file_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                    By {v.designer}
                  </div>
                  {v.feedback && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text2)',
                        fontStyle: 'italic',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'var(--bg)',
                        marginTop: 6,
                      }}
                    >
                      {v.feedback}
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontFeatureSettings: '"tnum"',
                      fontSize: 11,
                      color: 'var(--text3)',
                      marginTop: 6,
                    }}
                  >
                    {new Date(v.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Internal Comments */}
      <div>
        <div style={sectionHeader}>
          <MessageSquare style={{ width: 14, height: 14 }} />
          Internal Team Comments
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
            No internal comments yet. Comments added here are only visible to the team.
          </div>
        </div>
      </div>

      {/* Send Proof Button + Approval Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Send style={{ width: 14, height: 14 }} />
          Send Proof to Customer
        </button>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(34,192,122,0.12)',
            color: 'var(--green)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 style={{ width: 14, height: 14 }} />
          Proof v2 Approved
        </div>
      </div>
    </div>
  )
}

function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

// ─── Notes Tab ──────────────────────────────────────────────────────────────────
function NotesTab() {
  const [notes, setNotes] = useState(DEMO_NOTES)
  const [newNote, setNewNote] = useState('')

  const sectionHeader: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text2)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const handleSubmit = () => {
    const trimmed = newNote.trim()
    if (!trimmed) return
    setNotes([
      {
        id: `n-${Date.now()}`,
        author: 'You',
        initial: 'Y',
        content: trimmed,
        created_at: new Date().toISOString(),
      },
      ...notes,
    ])
    setNewNote('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Add Note Form */}
      <div>
        <div style={sectionHeader}>
          <StickyNote style={{ width: 14, height: 14 }} />
          Add Note
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 14,
          }}
        >
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write an internal note..."
            rows={3}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '10px 12px',
              color: 'var(--text1)',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSubmit}
              disabled={!newNote.trim()}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: newNote.trim() ? 'pointer' : 'default',
                opacity: newNote.trim() ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <StickyNote style={{ width: 13, height: 13 }} />
              Save Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div>
        <div style={sectionHeader}>
          <MessageSquare style={{ width: 14, height: 14 }} />
          Notes
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontFeatureSettings: '"tnum"',
              fontSize: 11,
              color: 'var(--text3)',
              fontWeight: 500,
            }}
          >
            ({notes.length})
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                gap: 12,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(79,127,255,0.15)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  flexShrink: 0,
                }}
              >
                {note.initial}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {note.author}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontFeatureSettings: '"tnum"',
                      fontSize: 11,
                      color: 'var(--text3)',
                    }}
                  >
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                  {note.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Activity Tab ───────────────────────────────────────────────────────────────
function ActivityTab({ activities }: { activities: ActivityEntry[] }) {
  return (
    <ActivityLog
      activities={activities}
      onAddNote={(note) => {
        // In a real app, this would POST to the API
      }}
    />
  )
}

// ─── Placeholder Tab ────────────────────────────────────────────────────────────
function PlaceholderTab({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon style={{ width: 24, height: 24, color: 'var(--text3)' }} />
      </div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text2)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 300 }}>
        Coming soon — will display {label.toLowerCase()} here.
      </div>
    </div>
  )
}
