'use client'

import { useState, useCallback } from 'react'
import {
  Zap, Bot, MessageSquare, FileText, DollarSign,
  Users, Palette, Wrench, Shield, Clock, BarChart3,
  ChevronDown, ChevronRight, Save, ToggleLeft, ToggleRight,
  AlertTriangle, CheckCircle,
} from 'lucide-react'

interface AISettings {
  ai_mode_enabled: boolean
  ai_mode_level: 'off' | 'assist' | 'copilot' | 'autonomous'
  ai_sales_enabled: boolean
  ai_sales_respond_new_leads: boolean
  ai_sales_send_estimates: boolean
  ai_sales_follow_up_days: number
  ai_sales_escalate_after_hours: number
  ai_sales_tone: 'professional' | 'friendly' | 'direct'
  ai_sales_signature: string
  ai_comms_enabled: boolean
  ai_comms_auto_reply_sms: boolean
  ai_comms_auto_reply_email: boolean
  ai_comms_office_hours_only: boolean
  ai_comms_office_start: string
  ai_comms_office_end: string
  ai_comms_ooo_message: string
  ai_estimate_enabled: boolean
  ai_estimate_auto_generate: boolean
  ai_estimate_markup_pct: number
  ai_estimate_include_labor: boolean
  ai_estimate_default_material: string
  ai_design_enabled: boolean
  ai_design_auto_mockup: boolean
  ai_design_style_prompt: string
  ai_production_enabled: boolean
  ai_production_auto_schedule: boolean
  ai_production_notify_installer: boolean
  ai_production_brief_auto_generate: boolean
  ai_portal_enabled: boolean
  ai_portal_chat_enabled: boolean
  ai_portal_status_updates: boolean
  ai_prospect_enabled: boolean
  ai_prospect_auto_research: boolean
  ai_prospect_outreach_sequence: boolean
  ai_prospect_daily_limit: number
  ai_followup_estimate_days: number[]
  ai_followup_invoice_days: number[]
  ai_followup_ghosted_days: number
  ai_escalate_enabled: boolean
  ai_escalate_keywords: string
  ai_escalate_to_role: string
  ai_escalate_angry_threshold: number
  ai_kb_enabled: boolean
  ai_kb_pricing_context: string
  ai_kb_shop_context: string
  ai_kb_materials_context: string
  ai_persona_name: string
  ai_persona_tone: string
  ai_persona_sign_off: string
  ai_learning_enabled: boolean
  ai_learning_use_closed_deals: boolean
  ai_learning_feedback_loop: boolean
  ai_security_log_all: boolean
  ai_security_human_review: boolean
  ai_security_block_competitors: boolean
  ai_security_pii_filter: boolean
  ai_analytics_track_response_time: boolean
  ai_analytics_track_conversion: boolean
  ai_analytics_weekly_report: boolean
}

const DEFAULT_SETTINGS: AISettings = {
  ai_mode_enabled: false,
  ai_mode_level: 'assist',
  ai_sales_enabled: false,
  ai_sales_respond_new_leads: true,
  ai_sales_send_estimates: false,
  ai_sales_follow_up_days: 3,
  ai_sales_escalate_after_hours: 24,
  ai_sales_tone: 'professional',
  ai_sales_signature: 'The USA WRAP CO Team',
  ai_comms_enabled: false,
  ai_comms_auto_reply_sms: false,
  ai_comms_auto_reply_email: false,
  ai_comms_office_hours_only: true,
  ai_comms_office_start: '08:00',
  ai_comms_office_end: '18:00',
  ai_comms_ooo_message: 'Thanks for reaching out! We will get back to you next business day.',
  ai_estimate_enabled: false,
  ai_estimate_auto_generate: false,
  ai_estimate_markup_pct: 35,
  ai_estimate_include_labor: true,
  ai_estimate_default_material: 'Avery SW900',
  ai_design_enabled: false,
  ai_design_auto_mockup: false,
  ai_design_style_prompt: 'Clean, bold design that maximizes brand visibility on vehicle wraps.',
  ai_production_enabled: false,
  ai_production_auto_schedule: false,
  ai_production_notify_installer: true,
  ai_production_brief_auto_generate: true,
  ai_portal_enabled: false,
  ai_portal_chat_enabled: false,
  ai_portal_status_updates: true,
  ai_prospect_enabled: false,
  ai_prospect_auto_research: false,
  ai_prospect_outreach_sequence: false,
  ai_prospect_daily_limit: 20,
  ai_followup_estimate_days: [1, 3, 7],
  ai_followup_invoice_days: [3, 7, 14],
  ai_followup_ghosted_days: 30,
  ai_escalate_enabled: true,
  ai_escalate_keywords: 'angry,refund,lawyer,terrible,worst,cancel',
  ai_escalate_to_role: 'owner',
  ai_escalate_angry_threshold: 2,
  ai_kb_enabled: true,
  ai_kb_pricing_context: '',
  ai_kb_shop_context: '',
  ai_kb_materials_context: '',
  ai_persona_name: 'Alex',
  ai_persona_tone: 'friendly and professional wrap expert who is passionate about vehicle customization',
  ai_persona_sign_off: 'The USA WRAP CO Team',
  ai_learning_enabled: false,
  ai_learning_use_closed_deals: true,
  ai_learning_feedback_loop: false,
  ai_security_log_all: true,
  ai_security_human_review: false,
  ai_security_block_competitors: false,
  ai_security_pii_filter: true,
  ai_analytics_track_response_time: true,
  ai_analytics_track_conversion: true,
  ai_analytics_weekly_report: false,
}
const MODE_OPTIONS = [
  { value: 'off', label: 'Off', desc: 'AI disabled entirely', color: '#5a6080' },
  { value: 'assist', label: 'Assist', desc: 'AI suggests, humans approve', color: '#f59e0b' },
  { value: 'copilot', label: 'Copilot', desc: 'AI acts, sends for review', color: '#4f7fff' },
  { value: 'autonomous', label: 'Autonomous', desc: 'AI runs operations end-to-end', color: '#22c07a' },
]

interface SectionProps {
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, subtitle, icon: Icon, color, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
          background: open ? "var(--surface2)" : "var(--surface)",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: color + "18",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{subtitle}</div>
        </div>
        {open
          ? <ChevronDown size={14} style={{ color: "var(--text3)" }} />
          : <ChevronRight size={14} style={{ color: "var(--text3)" }} />
        }
      </button>
      {open && (
        <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}
      >
        {value
          ? <ToggleRight size={26} style={{ color: "var(--green)" }} />
          : <ToggleLeft size={26} style={{ color: "var(--text3)" }} />
        }
      </button>
    </div>
  )
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>{desc}</div>}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7,
  border: "1px solid var(--border)", background: "var(--surface2)",
  color: "var(--text1)", fontSize: 13, outline: "none", boxSizing: "border-box",
}

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7,
  border: "1px solid var(--border)", background: "var(--surface2)",
  color: "var(--text1)", fontSize: 13, outline: "none", boxSizing: "border-box",
  resize: "vertical", minHeight: 80, lineHeight: 1.5,
}