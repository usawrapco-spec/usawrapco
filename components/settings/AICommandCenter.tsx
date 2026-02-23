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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AICommandCenterClient({ initialSettings }: { initialSettings: Partial<AISettings> }) {
  const [settings, setSettings] = useState<AISettings>({ ...DEFAULT_SETTINGS, ...initialSettings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = useCallback(<K extends keyof AISettings>(key: K, val: AISettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: val }))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/ai/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } catch { /* silently ignore */ }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 32, fontWeight: 900, color: "var(--text1)", display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
            <Bot size={26} style={{ color: "var(--accent)" }} /> AI Command Center
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
            Configure how AI assists, automates, and operates across your entire CRM
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9, border: "none", background: saved ? "var(--green)" : "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "background 0.2s" }}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Master switch */}
      <div style={{ padding: "16px 20px", border: "2px solid var(--accent)", borderRadius: 12, marginBottom: 20, background: "rgba(79,127,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Zap size={20} style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>AI Mode</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Master switch — enable AI across your CRM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { set("ai_mode_level", opt.value as AISettings["ai_mode_level"]); set("ai_mode_enabled", opt.value !== "off") }}
              title={opt.desc}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${settings.ai_mode_level === opt.value ? opt.color : "var(--border)"}`, background: settings.ai_mode_level === opt.value ? opt.color + "20" : "var(--surface2)", color: settings.ai_mode_level === opt.value ? opt.color : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode warning */}
      {settings.ai_mode_level === "autonomous" && (
        <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(242,90,90,0.08)", border: "1px solid rgba(242,90,90,0.3)", borderRadius: 10, marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "var(--red)" }}>
            <strong>Autonomous mode</strong> — AI will send messages, create estimates, and advance jobs without human approval. Review all sections below carefully before enabling.
          </div>
        </div>
      )}

      {/* ── Sections ── */}
      <Section title="Sales AI" subtitle="Auto-respond to leads, follow ups, and estimate sending" icon={MessageSquare} color="var(--accent)" defaultOpen>
        <Toggle label="Enable Sales AI" value={settings.ai_sales_enabled} onChange={v => set("ai_sales_enabled", v)} />
        <Toggle label="Auto-respond to new leads" desc="Reply immediately when a new lead fills out the shop form" value={settings.ai_sales_respond_new_leads} onChange={v => set("ai_sales_respond_new_leads", v)} />
        <Toggle label="Auto-send estimates" desc="Send estimate emails after AI generates pricing" value={settings.ai_sales_send_estimates} onChange={v => set("ai_sales_send_estimates", v)} />
        <Field label="Follow-up delay (days)">
          <input type="number" min={1} max={30} value={settings.ai_sales_follow_up_days} onChange={e => set("ai_sales_follow_up_days", +e.target.value)} style={{ ...inputStyle, width: 100 }} />
        </Field>
        <Field label="Escalate if no reply after (hours)">
          <input type="number" min={1} max={168} value={settings.ai_sales_escalate_after_hours} onChange={e => set("ai_sales_escalate_after_hours", +e.target.value)} style={{ ...inputStyle, width: 100 }} />
        </Field>
        <Field label="AI Tone">
          <select value={settings.ai_sales_tone} onChange={e => set("ai_sales_tone", e.target.value as any)} style={inputStyle}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="direct">Direct</option>
          </select>
        </Field>
        <Field label="Email Sign-off">
          <input value={settings.ai_sales_signature} onChange={e => set("ai_sales_signature", e.target.value)} style={inputStyle} />
        </Field>
      </Section>

      <Section title="Communications AI" subtitle="SMS and email auto-reply with office hours gating" icon={Zap} color="var(--cyan)">
        <Toggle label="Enable Communications AI" value={settings.ai_comms_enabled} onChange={v => set("ai_comms_enabled", v)} />
        <Toggle label="Auto-reply SMS" value={settings.ai_comms_auto_reply_sms} onChange={v => set("ai_comms_auto_reply_sms", v)} />
        <Toggle label="Auto-reply Email" value={settings.ai_comms_auto_reply_email} onChange={v => set("ai_comms_auto_reply_email", v)} />
        <Toggle label="Office hours only" desc="Only respond during configured hours" value={settings.ai_comms_office_hours_only} onChange={v => set("ai_comms_office_hours_only", v)} />
        <Field label="Office Hours">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={settings.ai_comms_office_start} onChange={e => set("ai_comms_office_start", e.target.value)} style={{ ...inputStyle, width: "auto" }} />
            <span style={{ color: "var(--text3)" }}>to</span>
            <input type="time" value={settings.ai_comms_office_end} onChange={e => set("ai_comms_office_end", e.target.value)} style={{ ...inputStyle, width: "auto" }} />
          </div>
        </Field>
        <Field label="Out-of-office message">
          <textarea value={settings.ai_comms_ooo_message} onChange={e => set("ai_comms_ooo_message", e.target.value)} style={textareaStyle} />
        </Field>
      </Section>

      <Section title="Estimate AI" subtitle="AI-generated pricing, material selection, and markup logic" icon={FileText} color="var(--green)">
        <Toggle label="Enable Estimate AI" value={settings.ai_estimate_enabled} onChange={v => set("ai_estimate_enabled", v)} />
        <Toggle label="Auto-generate estimates from intake" value={settings.ai_estimate_auto_generate} onChange={v => set("ai_estimate_auto_generate", v)} />
        <Toggle label="Include labor in AI pricing" value={settings.ai_estimate_include_labor} onChange={v => set("ai_estimate_include_labor", v)} />
        <Field label="Default markup %">
          <input type="number" min={0} max={100} value={settings.ai_estimate_markup_pct} onChange={e => set("ai_estimate_markup_pct", +e.target.value)} style={{ ...inputStyle, width: 100 }} />
        </Field>
        <Field label="Default material">
          <input value={settings.ai_estimate_default_material} onChange={e => set("ai_estimate_default_material", e.target.value)} style={inputStyle} />
        </Field>
      </Section>

      <Section title="Design AI" subtitle="Mockup generation and style direction prompts" icon={Palette} color="var(--purple)">
        <Toggle label="Enable Design AI" value={settings.ai_design_enabled} onChange={v => set("ai_design_enabled", v)} />
        <Toggle label="Auto-generate mockup on new job" value={settings.ai_design_auto_mockup} onChange={v => set("ai_design_auto_mockup", v)} />
        <Field label="Default design style prompt" desc="Guides the AI when generating mockup descriptions">
          <textarea value={settings.ai_design_style_prompt} onChange={e => set("ai_design_style_prompt", e.target.value)} style={textareaStyle} />
        </Field>
      </Section>

      <Section title="Production AI" subtitle="Auto-schedule, production brief generation, installer notifications" icon={Wrench} color="var(--amber)">
        <Toggle label="Enable Production AI" value={settings.ai_production_enabled} onChange={v => set("ai_production_enabled", v)} />
        <Toggle label="Auto-schedule print queue" value={settings.ai_production_auto_schedule} onChange={v => set("ai_production_auto_schedule", v)} />
        <Toggle label="Auto-notify installer on stage change" value={settings.ai_production_notify_installer} onChange={v => set("ai_production_notify_installer", v)} />
        <Toggle label="Auto-generate production brief" value={settings.ai_production_brief_auto_generate} onChange={v => set("ai_production_brief_auto_generate", v)} />
      </Section>

      <Section title="Prospect AI" subtitle="Research prospects and run outreach sequences automatically" icon={Users} color="var(--cyan)">
        <Toggle label="Enable Prospect AI" value={settings.ai_prospect_enabled} onChange={v => set("ai_prospect_enabled", v)} />
        <Toggle label="Auto-research new prospects" desc="Pull LinkedIn, website, and business data automatically" value={settings.ai_prospect_auto_research} onChange={v => set("ai_prospect_auto_research", v)} />
        <Toggle label="Run outreach sequences" desc="Send multi-touch email sequences to cold prospects" value={settings.ai_prospect_outreach_sequence} onChange={v => set("ai_prospect_outreach_sequence", v)} />
        <Field label="Max daily outreach limit">
          <input type="number" min={1} max={200} value={settings.ai_prospect_daily_limit} onChange={e => set("ai_prospect_daily_limit", +e.target.value)} style={{ ...inputStyle, width: 100 }} />
        </Field>
      </Section>

      <Section title="AI Persona" subtitle="Name, tone, and personality of your AI assistant" icon={Bot} color="var(--accent)">
        <Field label="AI Name">
          <input value={settings.ai_persona_name} onChange={e => set("ai_persona_name", e.target.value)} style={inputStyle} placeholder="Alex" />
        </Field>
        <Field label="Persona tone (describe in plain text)">
          <textarea value={settings.ai_persona_tone} onChange={e => set("ai_persona_tone", e.target.value)} style={textareaStyle} />
        </Field>
        <Field label="Sign-off">
          <input value={settings.ai_persona_sign_off} onChange={e => set("ai_persona_sign_off", e.target.value)} style={inputStyle} />
        </Field>
      </Section>

      <Section title="Escalation Rules" subtitle="When AI should hand off to a human" icon={AlertTriangle} color="var(--red)">
        <Toggle label="Enable escalation" value={settings.ai_escalate_enabled} onChange={v => set("ai_escalate_enabled", v)} />
        <Field label="Trigger keywords (comma-separated)">
          <input value={settings.ai_escalate_keywords} onChange={e => set("ai_escalate_keywords", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Escalate to role">
          <select value={settings.ai_escalate_to_role} onChange={e => set("ai_escalate_to_role", e.target.value)} style={inputStyle}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="sales_agent">Sales Agent</option>
          </select>
        </Field>
        <Field label="Escalate after N frustrated replies">
          <input type="number" min={1} max={10} value={settings.ai_escalate_angry_threshold} onChange={e => set("ai_escalate_angry_threshold", +e.target.value)} style={{ ...inputStyle, width: 80 }} />
        </Field>
      </Section>

      <Section title="Security & Privacy" subtitle="Audit logging, PII filtering, and human review gates" icon={Shield} color="var(--text3)">
        <Toggle label="Log all AI interactions" value={settings.ai_security_log_all} onChange={v => set("ai_security_log_all", v)} />
        <Toggle label="Require human review before sending" desc="A human must approve all AI-generated messages" value={settings.ai_security_human_review} onChange={v => set("ai_security_human_review", v)} />
        <Toggle label="Block competitor mentions" desc="AI will not name or discuss competitors" value={settings.ai_security_block_competitors} onChange={v => set("ai_security_block_competitors", v)} />
        <Toggle label="PII filter" desc="Strip phone numbers and emails from AI memory" value={settings.ai_security_pii_filter} onChange={v => set("ai_security_pii_filter", v)} />
      </Section>

      <Section title="Analytics & Learning" subtitle="Track performance and improve AI over time" icon={BarChart3} color="var(--green)">
        <Toggle label="Track AI response time" value={settings.ai_analytics_track_response_time} onChange={v => set("ai_analytics_track_response_time", v)} />
        <Toggle label="Track conversion from AI leads" value={settings.ai_analytics_track_conversion} onChange={v => set("ai_analytics_track_conversion", v)} />
        <Toggle label="Weekly AI performance report" value={settings.ai_analytics_weekly_report} onChange={v => set("ai_analytics_weekly_report", v)} />
        <Toggle label="Learn from closed deals" desc="AI improves pricing and tone from won deals" value={settings.ai_learning_use_closed_deals} onChange={v => set("ai_learning_use_closed_deals", v)} />
      </Section>
    </div>
  )
}