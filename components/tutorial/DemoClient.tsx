'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Truck,
  Phone,
  FileText,
  Send,
  CheckCircle2,
  ShoppingCart,
  Palette,
  ThumbsUp,
  Printer,
  Wrench,
  ClipboardCheck,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  DollarSign,
  User,
  Mail,
  Clock,
  Package,
  Star,
  Sparkles,
} from 'lucide-react'

// ─── Colors ─────────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0f14',
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#1e2330',
  borderHover: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
}

// ─── Demo Step Data ─────────────────────────────────────────────────────────────
interface DemoStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  accentColor: string
  content: React.ReactNode
}

function StepBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  )
}

function MiniCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.surface2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 14,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function LineItem({ label, amount, bold }: { label: string; amount: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: bold ? 'none' : `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: bold ? C.text1 : C.text2, fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: bold ? C.green : C.text1,
          fontWeight: bold ? 700 : 500,
        }}
      >
        {amount}
      </span>
    </div>
  )
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, background: `${color}18`, borderRadius: 3, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <CheckCircle2
        size={14}
        style={{ color: checked ? C.green : C.text3, flexShrink: 0 }}
      />
      <span style={{ fontSize: 12, color: checked ? C.text2 : C.text3 }}>{label}</span>
    </div>
  )
}

// ─── Step Content Renderers ─────────────────────────────────────────────────────

function Step1Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `${C.accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User size={18} style={{ color: C.accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>Bob Martinez</span>
            <StepBadge label="New Lead" color={C.cyan} />
          </div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>
            Owner, Bob&apos;s Pizza -- (555) 867-5309
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Vehicle</div>
              <div style={{ fontSize: 13, color: C.text1 }}>2024 Ford Transit -- White</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Service</div>
              <div style={{ fontSize: 13, color: C.text1 }}>Full Commercial Wrap</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Source</div>
              <div style={{ fontSize: 13, color: C.text1 }}>Google Search</div>
            </div>
          </div>
        </div>
      </div>
    </MiniCard>
  )
}

function Step2Content() {
  return (
    <MiniCard>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>Estimate #1047</span>
          <StepBadge label="Draft" color={C.amber} />
        </div>
        <LineItem label="Full Vehicle Wrap -- Ford Transit" amount="$2,400.00" />
        <LineItem label="Custom Design (Logo + Menu Layout)" amount="$800.00" />
        <div style={{ height: 8 }} />
        <LineItem label="Total Revenue" amount="$3,200.00" bold />
      </div>
      <div
        style={{
          background: `${C.green}0c`,
          border: `1px solid ${C.green}25`,
          borderRadius: 6,
          padding: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {[
          { label: 'Revenue', value: '$3,200', color: C.text1 },
          { label: 'COGS', value: '$1,200', color: C.red },
          { label: 'Gross Profit', value: '$2,000', color: C.green },
          { label: 'GPM', value: '62.5%', color: C.green },
        ].map((m) => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </MiniCard>
  )
}

function Step3Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Mail size={16} style={{ color: C.accent }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Email Preview</span>
      </div>
      <div style={{ background: C.bg, borderRadius: 6, padding: 12, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>To: bob@bobspizza.com</div>
        <div style={{ fontSize: 11, color: C.text3, marginBottom: 8 }}>Subject: Your Vehicle Wrap Estimate from USA Wrap Co</div>
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
          Hi Bob, thanks for reaching out! Here is your estimate for the Ford Transit wrap.
          Click the link below to review, sign, and get started.
        </div>
        <div
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            background: C.accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <FileText size={12} />
          View Estimate
        </div>
      </div>
    </MiniCard>
  )
}

function Step4Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>Customer Acceptance Flow</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: 'View Estimate', icon: <FileText size={12} />, done: true },
          { label: 'Sign Contract', icon: <FileText size={12} />, done: true },
          { label: 'Upload Assets', icon: <Package size={12} />, done: true },
          { label: 'Pay Deposit', icon: <CreditCard size={12} />, done: true },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              minWidth: 100,
              background: s.done ? `${C.green}0c` : C.bg,
              border: `1px solid ${s.done ? C.green + '30' : C.border}`,
              borderRadius: 6,
              padding: '8px 10px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              <CheckCircle2 size={12} style={{ color: C.green }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.text3 }}>
                {i + 1}/4
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.text2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <DollarSign size={14} style={{ color: C.green }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.green, fontWeight: 700 }}>
          $1,600.00 deposit received
        </span>
      </div>
    </MiniCard>
  )
}

function Step5Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>Sales Order #SO-2047</span>
        <StepBadge label="Active" color={C.accent} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 140, background: C.bg, borderRadius: 6, padding: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Line Item 1</div>
          <div style={{ fontSize: 12, color: C.text1 }}>Full Vehicle Wrap</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.text2 }}>$2,400.00</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: C.bg, borderRadius: 6, padding: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Line Item 2</div>
          <div style={{ fontSize: 12, color: C.text1 }}>Custom Design</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.text2 }}>$800.00</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowRight size={12} style={{ color: C.accent }} />
        <span style={{ fontSize: 12, color: C.text2 }}>
          2 jobs auto-created from line items
        </span>
      </div>
    </MiniCard>
  )
}

function Step6Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Design Brief</div>
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 8 }}>
            Full wrap for pizza delivery van. Include logo on both sides, phone number on rear,
            menu items on passenger side. Brand colors: red, white, green.
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <StepBadge label="Logo.ai" color={C.purple} />
            <StepBadge label="Menu.pdf" color={C.purple} />
            <StepBadge label="Photos" color={C.purple} />
          </div>
        </div>
        <div
          style={{
            width: 140,
            height: 90,
            borderRadius: 6,
            background: `linear-gradient(135deg, ${C.purple}20, ${C.accent}20)`,
            border: `1px solid ${C.purple}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <Palette size={22} style={{ color: C.purple }} />
          <span style={{ fontSize: 10, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Proof v1
          </span>
        </div>
      </div>
    </MiniCard>
  )
}

function Step7Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `${C.green}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ThumbsUp size={22} style={{ color: C.green }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.green, marginBottom: 2 }}>
            Design Approved
          </div>
          <div style={{ fontSize: 12, color: C.text2 }}>
            Bob approved version 2 of the wrap design
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
            &quot;Looks perfect! Love the menu layout on the side.&quot;
          </div>
        </div>
      </div>
    </MiniCard>
  )
}

function Step8Content() {
  return (
    <MiniCard>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Printer size={14} style={{ color: C.purple }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Production Card</span>
          <StepBadge label="Printing" color={C.purple} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Material</div>
            <div style={{ fontSize: 12, color: C.text1 }}>3M IJ180Cv3 + 8518 Lam</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Sq Ft</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.text1 }}>285 ft</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Printer</div>
            <div style={{ fontSize: 12, color: C.text1 }}>Roland TrueVIS VG3</div>
          </div>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.text2 }}>Print Progress</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.purple }}>75%</span>
        </div>
        <ProgressBar value={75} color={C.purple} />
      </div>
    </MiniCard>
  )
}

function Step9Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Clock size={14} style={{ color: C.cyan }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Install Timer</span>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28,
              fontWeight: 700,
              color: C.cyan,
              marginBottom: 4,
            }}
          >
            14:32:18
          </div>
          <div style={{ fontSize: 11, color: C.text3 }}>Day 2 of 2 -- Installer: Mike R.</div>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Install Checklist
          </div>
          <CheckItem label="Surface prep complete" checked={true} />
          <CheckItem label="Driver side applied" checked={true} />
          <CheckItem label="Passenger side applied" checked={true} />
          <CheckItem label="Hood / roof applied" checked={true} />
          <CheckItem label="Rear panel applied" checked={false} />
          <CheckItem label="Post-heat completed" checked={false} />
        </div>
      </div>
    </MiniCard>
  )
}

function Step10Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ClipboardCheck size={14} style={{ color: C.amber }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>QC Inspection</span>
        <StepBadge label="Passed" color={C.green} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          'Edge sealing',
          'Bubble-free application',
          'Color consistency',
          'Alignment accuracy',
          'Corner tucks',
          'Post-heat cure',
        ].map((item) => (
          <CheckItem key={item} label={item} checked={true} />
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: C.text2 }}>
        Reviewed by: Production Manager -- All 6/6 checks passed
      </div>
    </MiniCard>
  )
}

function Step11Content() {
  return (
    <MiniCard>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Receipt size={14} style={{ color: C.green }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Invoice #INV-3048</span>
          </div>
          <LineItem label="Full Vehicle Wrap" amount="$2,400.00" />
          <LineItem label="Custom Design" amount="$800.00" />
          <LineItem label="Deposit Paid" amount="-$1,600.00" />
          <div style={{ height: 4 }} />
          <LineItem label="Balance Due" amount="$1,600.00" bold />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Commission Breakdown
          </div>
          <div style={{ background: C.bg, borderRadius: 6, padding: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text2 }}>Sales Rep (8%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.green }}>$256.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text2 }}>Designer (5%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.green }}>$160.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: C.text2 }}>Installer</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.green }}>$480.00</span>
            </div>
          </div>
        </div>
      </div>
    </MiniCard>
  )
}

function Step12Content() {
  return (
    <MiniCard>
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `${C.green}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <CheckCircle2 size={28} style={{ color: C.green }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.green, marginBottom: 4 }}>
          Payment Received
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24,
            fontWeight: 700,
            color: C.text1,
            marginBottom: 4,
          }}
        >
          $1,600.00
        </div>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>
          Paid via Stripe -- Visa ending 4242
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <StepBadge label="Receipt Sent" color={C.green} />
          <StepBadge label="Job Closed" color={C.green} />
        </div>
      </div>
    </MiniCard>
  )
}

// ─── Steps Array ────────────────────────────────────────────────────────────────

const STEPS: DemoStep[] = [
  {
    id: 1,
    title: 'Customer Inquiry',
    description: 'Bob calls about wrapping his pizza delivery truck',
    icon: <Phone size={18} />,
    accentColor: C.cyan,
    content: <Step1Content />,
  },
  {
    id: 2,
    title: 'Create Estimate',
    description: 'Sales rep creates an estimate with line items',
    icon: <FileText size={18} />,
    accentColor: C.accent,
    content: <Step2Content />,
  },
  {
    id: 3,
    title: 'Send to Customer',
    description: 'Estimate emailed to Bob for review',
    icon: <Send size={18} />,
    accentColor: C.accent,
    content: <Step3Content />,
  },
  {
    id: 4,
    title: 'Customer Accepts',
    description: 'Bob reviews, signs contract, uploads assets',
    icon: <CheckCircle2 size={18} />,
    accentColor: C.green,
    content: <Step4Content />,
  },
  {
    id: 5,
    title: 'Convert to Sales Order',
    description: 'Estimate becomes a Sales Order, jobs created',
    icon: <ShoppingCart size={18} />,
    accentColor: C.accent,
    content: <Step5Content />,
  },
  {
    id: 6,
    title: 'Design Phase',
    description: 'Designer creates wrap mockup, sends proof',
    icon: <Palette size={18} />,
    accentColor: C.purple,
    content: <Step6Content />,
  },
  {
    id: 7,
    title: 'Customer Approves Proof',
    description: 'Bob approves v2 of the design',
    icon: <ThumbsUp size={18} />,
    accentColor: C.green,
    content: <Step7Content />,
  },
  {
    id: 8,
    title: 'Production',
    description: 'Wrap printed and laminated',
    icon: <Printer size={18} />,
    accentColor: C.purple,
    content: <Step8Content />,
  },
  {
    id: 9,
    title: 'Installation',
    description: 'Installer completes wrap in 2 days',
    icon: <Wrench size={18} />,
    accentColor: C.cyan,
    content: <Step9Content />,
  },
  {
    id: 10,
    title: 'QC Review',
    description: 'Production manager verifies quality',
    icon: <ClipboardCheck size={18} />,
    accentColor: C.amber,
    content: <Step10Content />,
  },
  {
    id: 11,
    title: 'Job Closed',
    description: 'Invoice auto-generated, commission calculated',
    icon: <Receipt size={18} />,
    accentColor: C.green,
    content: <Step11Content />,
  },
  {
    id: 12,
    title: 'Customer Pays',
    description: 'Bob pays via Stripe, receipt generated',
    icon: <CreditCard size={18} />,
    accentColor: C.green,
    content: <Step12Content />,
  },
]

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DemoClient() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]))
  const [visible, setVisible] = useState<Set<number>>(new Set())
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-step'))
            if (!isNaN(idx)) {
              setVisible((prev) => {
                const next = new Set(prev)
                next.add(idx)
                return next
              })
            }
          }
        })
      },
      { threshold: 0.15 }
    )
    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const toggleStep = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text1,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: '24px 20px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
          <Truck size={26} style={{ color: C.accent }} />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: '-.01em',
              color: C.text1,
              textTransform: 'uppercase',
            }}
          >
            USA WRAP CO
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '.1em',
            color: C.text3,
            textTransform: 'uppercase',
          }}
        >
          Platform Demo
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '48px 20px 32px', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Sparkles size={16} style={{ color: C.amber }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.amber, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Interactive Walkthrough
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '.02em',
            color: C.text1,
            textTransform: 'uppercase',
            marginBottom: 12,
            lineHeight: 1.15,
          }}
        >
          See How a Job Flows From Call to Close
        </h1>
        <p style={{ fontSize: 15, color: C.text2, lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
          Follow Bob&apos;s pizza delivery truck through every stage of the wrap process --
          from initial inquiry to final payment.
        </p>
      </section>

      {/* ── Steps ─────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 80px', position: 'relative' }}>
        {/* Progress line */}
        <div
          style={{
            position: 'absolute',
            left: 39,
            top: 0,
            bottom: 80,
            width: 2,
            background: `linear-gradient(to bottom, ${C.border}, ${C.accent}40, ${C.green}40, ${C.border})`,
            zIndex: 0,
          }}
        />

        {STEPS.map((step, i) => {
          const isExpanded = expanded.has(step.id)
          const isVisible = visible.has(step.id)

          return (
            <div
              key={step.id}
              ref={(el) => { cardRefs.current[i] = el }}
              data-step={step.id}
              style={{
                position: 'relative',
                zIndex: 1,
                marginBottom: 16,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                transitionDelay: `${i * 50}ms`,
              }}
            >
              {/* Step card */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${isExpanded ? step.accentColor + '40' : C.border}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'border-color 0.3s ease',
                }}
              >
                {/* Header row */}
                <button
                  onClick={() => toggleStep(step.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: `${step.accentColor}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step.accentColor,
                      flexShrink: 0,
                      transition: 'background 0.3s ease',
                    }}
                  >
                    {step.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          fontWeight: 700,
                          color: step.accentColor,
                          opacity: 0.7,
                        }}
                      >
                        {String(step.id).padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: 16,
                          fontWeight: 700,
                          letterSpacing: '.05em',
                          color: C.text1,
                          textTransform: 'uppercase',
                        }}
                      >
                        {step.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                      {step.description}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div style={{ flexShrink: 0, color: C.text3 }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expandable content */}
                <div
                  style={{
                    maxHeight: isExpanded ? 600 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s ease',
                  }}
                >
                  <div style={{ padding: '0 16px 16px' }}>
                    {step.content}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          padding: '48px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <Star size={28} style={{ color: C.amber, marginBottom: 12 }} />
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '.04em',
              color: C.text1,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Ready to Streamline Your Shop?
          </h2>
          <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>
            From estimates to install tracking to commissions -- USA Wrap Co handles it all
            in one platform built specifically for wrap shops.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 32px',
              borderRadius: 8,
              background: C.accent,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            Start Free Trial
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer style={{ padding: '20px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: C.text3 }}>
          USA Wrap Co -- Operations Platform v5.0
        </span>
      </footer>
    </div>
  )
}
