'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bot, MessageCircle, Mail, Image, Palette, Printer, Target,
  DollarSign, MessageSquare, Bell, AlertTriangle, Shield,
  Link2, Zap, BarChart3, ChevronDown, ChevronRight, Save,
  Loader2, Check, Clock, Settings
} from 'lucide-react'

interface AISection {
  key: string
  title: string
  icon: any
  description: string
  fields: AIField[]
}

interface AIField {
  key: string
  label: string
  type: 'toggle' | 'select' | 'text' | 'textarea' | 'number' | 'multi-select' | 'slider' | 'password'
  options?: { value: string; label: string }[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
  description?: string
}

const SECTIONS: AISection[] = [
  {
    key: 'vinyl_behavior',
    title: '1. V.I.N.Y.L. Behavior',
    icon: Bot,
    description: 'Control how V.I.N.Y.L. AI assistant behaves across the platform',
    fields: [
      { key: 'enabled', label: 'Enable V.I.N.Y.L. Globally', type: 'toggle' },
      { key: 'personality', label: 'Personality Style', type: 'select', options: [
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'concise', label: 'Concise & Direct' },
        { value: 'technical', label: 'Technical' },
      ]},
      { key: 'response_length', label: 'Response Length', type: 'select', options: [
        { value: 'brief', label: 'Brief (1-2 sentences)' },
        { value: 'standard', label: 'Standard (paragraph)' },
        { value: 'detailed', label: 'Detailed (multi-paragraph)' },
      ]},
      { key: 'voice_input', label: 'Enable Voice Input', type: 'toggle' },
      { key: 'allowed_roles', label: 'Roles with Access', type: 'multi-select', options: [
        { value: 'owner', label: 'Owner' },
        { value: 'admin', label: 'Admin' },
        { value: 'sales_agent', label: 'Sales Agent' },
        { value: 'designer', label: 'Designer' },
        { value: 'production', label: 'Production' },
        { value: 'installer', label: 'Installer' },
      ]},
    ],
  },
  {
    key: 'ai_sales_agent',
    title: '2. AI Sales Agent',
    icon: MessageCircle,
    description: 'Configure the AI-powered sales agent for lead handling',
    fields: [
      { key: 'enabled', label: 'Enable AI Sales Agent', type: 'toggle' },
      { key: 'agent_name', label: 'Agent Display Name', type: 'text', placeholder: 'V.I.N.Y.L.' },
      { key: 'response_time_target', label: 'Response Time Target (seconds)', type: 'number', min: 5, max: 300 },
      { key: 'auto_respond_start', label: 'Auto-Respond Start Hour', type: 'select', options: Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}` })) },
      { key: 'auto_respond_end', label: 'Auto-Respond End Hour', type: 'select', options: Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}` })) },
      { key: 'escalation_trigger', label: 'Escalation Triggers', type: 'multi-select', options: [
        { value: 'price_over_5k', label: 'Price over $5,000' },
        { value: 'angry_customer', label: 'Angry/Frustrated Customer' },
        { value: 'fleet_inquiry', label: 'Fleet Inquiry' },
        { value: 'competitor_mention', label: 'Competitor Mentioned' },
        { value: 'human_request', label: 'Customer Requests Human' },
      ]},
    ],
  },
  {
    key: 'communication_sequences',
    title: '3. Communication Sequences',
    icon: Mail,
    description: 'Automated message sequences for different stages',
    fields: [
      { key: 'pre_sale_delay', label: 'Pre-Sale Follow-Up Delay (hours)', type: 'number', min: 1, max: 168 },
      { key: 'post_deposit_delay', label: 'Post-Deposit Thank You Delay (hours)', type: 'number', min: 0, max: 48 },
      { key: 'design_approval_reminder', label: 'Design Approval Reminder Delay (hours)', type: 'number', min: 12, max: 168 },
      { key: 'install_reminder_delay', label: 'Install Reminder Delay (hours)', type: 'number', min: 12, max: 72 },
      { key: 'post_install_followup', label: 'Post-Install Follow-Up Delay (hours)', type: 'number', min: 12, max: 168 },
      { key: 'reengagement_delay', label: 'Re-Engagement Delay (days)', type: 'number', min: 7, max: 365 },
    ],
  },
  {
    key: 'mockup_generation',
    title: '4. Mockup Generation',
    icon: Image,
    description: 'AI-powered vehicle wrap mockup generation settings',
    fields: [
      { key: 'enabled', label: 'Enable AI Mockups', type: 'toggle' },
      { key: 'provider', label: 'AI Provider', type: 'select', options: [
        { value: 'replicate', label: 'Replicate' },
        { value: 'stability', label: 'Stability AI' },
        { value: 'dalle', label: 'DALL-E' },
      ]},
      { key: 'watermark', label: 'Watermark Until Deposit', type: 'toggle' },
      { key: 'watermark_text', label: 'Watermark Text', type: 'text', placeholder: 'USA WRAP CO - PROOF' },
      { key: 'angles', label: 'Default Angles', type: 'multi-select', options: [
        { value: 'front_34', label: 'Front 3/4' },
        { value: 'rear_34', label: 'Rear 3/4' },
        { value: 'side_driver', label: 'Driver Side' },
        { value: 'side_passenger', label: 'Passenger Side' },
        { value: 'front', label: 'Front' },
        { value: 'rear', label: 'Rear' },
      ]},
      { key: 'resolution', label: 'Resolution', type: 'select', options: [
        { value: '1024x1024', label: '1024x1024' },
        { value: '1536x1024', label: '1536x1024' },
        { value: '2048x1024', label: '2048x1024' },
      ]},
    ],
  },
  {
    key: 'design_assistance',
    title: '5. Design Assistance',
    icon: Palette,
    description: 'AI design quality checks and assistance',
    fields: [
      { key: 'logo_analysis', label: 'Auto Logo Analysis', type: 'toggle', description: 'Automatically analyze uploaded logos for quality' },
      { key: 'low_res_flagging', label: 'Flag Low-Resolution Files', type: 'toggle' },
      { key: 'min_dpi', label: 'Minimum DPI Threshold', type: 'number', min: 72, max: 600 },
      { key: 'color_profile_check', label: 'Color Profile Check', type: 'toggle' },
      { key: 'auto_suggest_fonts', label: 'Auto-Suggest Fonts', type: 'toggle' },
    ],
  },
  {
    key: 'production_files',
    title: '6. Production File Generation',
    icon: Printer,
    description: 'Automated production-ready file generation',
    fields: [
      { key: 'auto_bleed', label: 'Auto-Add Bleed', type: 'toggle' },
      { key: 'bleed_size', label: 'Bleed Size (inches)', type: 'number', min: 0.125, max: 1, step: 0.125 },
      { key: 'output_dpi', label: 'Output DPI', type: 'select', options: [
        { value: '150', label: '150 DPI' },
        { value: '300', label: '300 DPI' },
        { value: '600', label: '600 DPI' },
      ]},
      { key: 'cmyk_conversion', label: 'Auto CMYK Conversion', type: 'toggle' },
      { key: 'auto_qc', label: 'Auto QC Checks', type: 'toggle', description: 'Run automated quality checks before production' },
    ],
  },
  {
    key: 'lead_qualification',
    title: '7. Lead Qualification',
    icon: Target,
    description: 'AI-powered lead scoring and qualification',
    fields: [
      { key: 'enabled', label: 'Enable AI Lead Scoring', type: 'toggle' },
      { key: 'scoring_model', label: 'Scoring Model', type: 'select', options: [
        { value: 'simple', label: 'Simple (Budget + Timeline)' },
        { value: 'advanced', label: 'Advanced (Multi-Factor)' },
      ]},
      { key: 'required_info', label: 'Required Info for Qualification', type: 'multi-select', options: [
        { value: 'vehicle_type', label: 'Vehicle Type' },
        { value: 'budget', label: 'Budget Range' },
        { value: 'timeline', label: 'Timeline' },
        { value: 'wrap_type', label: 'Wrap Type' },
        { value: 'company_name', label: 'Company Name' },
      ]},
      { key: 'auto_tagging', label: 'Auto-Tag Leads', type: 'toggle' },
      { key: 'hot_lead_threshold', label: 'Hot Lead Score Threshold', type: 'number', min: 50, max: 100 },
    ],
  },
  {
    key: 'pricing_intelligence',
    title: '8. Pricing Intelligence',
    icon: DollarSign,
    description: 'AI-assisted pricing and margin management',
    fields: [
      { key: 'default_markup', label: 'Default Markup %', type: 'number', min: 10, max: 300 },
      { key: 'margin_warning', label: 'Margin Warning Threshold %', type: 'number', min: 10, max: 80 },
      { key: 'fleet_discount_5', label: 'Fleet Discount (5-9 vehicles) %', type: 'number', min: 0, max: 50 },
      { key: 'fleet_discount_10', label: 'Fleet Discount (10-24 vehicles) %', type: 'number', min: 0, max: 50 },
      { key: 'fleet_discount_25', label: 'Fleet Discount (25+ vehicles) %', type: 'number', min: 0, max: 50 },
      { key: 'auto_suggest_price', label: 'Auto-Suggest Pricing', type: 'toggle' },
    ],
  },
  {
    key: 'communication_tone',
    title: '9. Customer Communication Tone',
    icon: MessageSquare,
    description: 'Control AI communication style with customers',
    fields: [
      { key: 'tone', label: 'Communication Tone', type: 'select', options: [
        { value: 'professional', label: 'Professional' },
        { value: 'friendly', label: 'Friendly & Warm' },
        { value: 'casual', label: 'Casual' },
        { value: 'formal', label: 'Formal' },
      ]},
      { key: 'emoji_usage', label: 'Use Emojis', type: 'select', options: [
        { value: 'never', label: 'Never' },
        { value: 'minimal', label: 'Minimal' },
        { value: 'moderate', label: 'Moderate' },
      ]},
      { key: 'formality', label: 'Formality Level', type: 'slider', min: 1, max: 5 },
      { key: 'auto_translate', label: 'Auto-Translate (Spanish)', type: 'toggle' },
      { key: 'sign_off', label: 'Email Sign-Off', type: 'text', placeholder: 'Best regards, USA Wrap Co Team' },
    ],
  },
  {
    key: 'notifications',
    title: '10. Notifications',
    icon: Bell,
    description: 'Configure AI notification channels',
    fields: [
      { key: 'slack_webhook', label: 'Slack Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'sms_owner_alerts', label: 'SMS Alerts to Owner', type: 'toggle' },
      { key: 'owner_phone', label: 'Owner Phone Number', type: 'text', placeholder: '+1 (206) 555-0100' },
      { key: 'daily_summary', label: 'Daily Summary Email', type: 'toggle' },
      { key: 'summary_time', label: 'Summary Send Time', type: 'select', options: [
        { value: '6', label: '6:00 AM' },
        { value: '7', label: '7:00 AM' },
        { value: '8', label: '8:00 AM' },
        { value: '9', label: '9:00 AM' },
      ]},
    ],
  },
  {
    key: 'human_escalation',
    title: '11. Human Escalation',
    icon: AlertTriangle,
    description: 'When and how to escalate to human team members',
    fields: [
      { key: 'triggers', label: 'Escalation Triggers', type: 'multi-select', options: [
        { value: 'angry', label: 'Customer Frustration Detected' },
        { value: 'price_question', label: 'Complex Pricing Question' },
        { value: 'complaint', label: 'Complaint' },
        { value: 'refund', label: 'Refund/Cancel Request' },
        { value: 'human_request', label: 'Customer Requests Human' },
        { value: 'low_confidence', label: 'Low AI Confidence' },
      ]},
      { key: 'escalation_target', label: 'Default Escalation Target', type: 'select', options: [
        { value: 'owner', label: 'Owner' },
        { value: 'sales_lead', label: 'Sales Lead' },
        { value: 'round_robin', label: 'Round Robin' },
      ]},
      { key: 'notification_method', label: 'Notification Method', type: 'multi-select', options: [
        { value: 'sms', label: 'SMS' },
        { value: 'email', label: 'Email' },
        { value: 'slack', label: 'Slack' },
        { value: 'in_app', label: 'In-App' },
      ]},
    ],
  },
  {
    key: 'data_privacy',
    title: '12. Data & Privacy',
    icon: Shield,
    description: 'AI data handling and privacy controls',
    fields: [
      { key: 'conversation_logging', label: 'Log AI Conversations', type: 'toggle' },
      { key: 'retention_days', label: 'Data Retention (days)', type: 'number', min: 7, max: 365 },
      { key: 'data_access', label: 'Data Access Level', type: 'select', options: [
        { value: 'full', label: 'Full (all customer data)' },
        { value: 'limited', label: 'Limited (no financials)' },
        { value: 'minimal', label: 'Minimal (name & contact only)' },
      ]},
      { key: 'anonymize_exports', label: 'Anonymize Data Exports', type: 'toggle' },
    ],
  },
  {
    key: 'integrations',
    title: '13. Integrations',
    icon: Link2,
    description: 'Third-party service connections',
    fields: [
      { key: 'quickbooks_key', label: 'QuickBooks API Key', type: 'password', placeholder: 'Enter API key...' },
      { key: 'quickbooks_status', label: 'QuickBooks Status', type: 'select', options: [
        { value: 'not_connected', label: 'Not Connected' },
        { value: 'connected', label: 'Connected' },
      ]},
      { key: 'twilio_sid', label: 'Twilio Account SID', type: 'password', placeholder: 'AC...' },
      { key: 'twilio_token', label: 'Twilio Auth Token', type: 'password', placeholder: 'Enter token...' },
      { key: 'twilio_phone', label: 'Twilio Phone Number', type: 'text', placeholder: '+1...' },
      { key: 'stripe_key', label: 'Stripe Secret Key', type: 'password', placeholder: 'sk_...' },
      { key: 'gmail_connected', label: 'Gmail Status', type: 'select', options: [
        { value: 'not_connected', label: 'Not Connected' },
        { value: 'connected', label: 'Connected' },
      ]},
      { key: 'slack_bot_token', label: 'Slack Bot Token', type: 'password', placeholder: 'xoxb-...' },
      { key: 'replicate_key', label: 'Replicate API Key', type: 'password', placeholder: 'r8_...' },
    ],
  },
  {
    key: 'ai_mode',
    title: '14. AI Mode Switch',
    icon: Zap,
    description: 'Control AI autonomy level across the platform',
    fields: [
      { key: 'mode', label: 'AI Operating Mode', type: 'select', options: [
        { value: 'standard', label: 'Standard (Manual with AI Suggestions)' },
        { value: 'ai_assisted', label: 'AI-Assisted (AI Drafts, Human Approves)' },
        { value: 'fully_autonomous', label: 'Fully Autonomous (AI Acts Independently)' },
      ]},
      { key: 'autonomous_warning_acknowledged', label: 'I understand the risks of autonomous mode', type: 'toggle' },
      { key: 'autonomous_actions', label: 'Autonomous Actions Allowed', type: 'multi-select', options: [
        { value: 'respond_leads', label: 'Respond to Leads' },
        { value: 'send_quotes', label: 'Send Quotes' },
        { value: 'schedule_followups', label: 'Schedule Follow-Ups' },
        { value: 'create_tasks', label: 'Create Tasks' },
        { value: 'send_reminders', label: 'Send Reminders' },
      ]},
    ],
  },
  {
    key: 'usage_limits',
    title: '15. Usage & Limits',
    icon: BarChart3,
    description: 'AI usage tracking and budget controls',
    fields: [
      { key: 'monthly_budget', label: 'Monthly Budget Cap ($)', type: 'number', min: 0, max: 10000 },
      { key: 'disable_when_exceeded', label: 'Disable AI When Budget Exceeded', type: 'toggle' },
      { key: 'alert_threshold', label: 'Alert at % of Budget', type: 'number', min: 50, max: 95 },
      { key: 'max_tokens_per_request', label: 'Max Tokens Per Request', type: 'number', min: 256, max: 4096 },
    ],
  },
]

export default function AIControlsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, any>>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('ai_settings')
        .select('*')

      if (data) {
        const map: Record<string, Record<string, any>> = {}
        const timestamps: Record<string, string> = {}
        data.forEach((row: any) => {
          map[row.setting_key] = row.setting_value || {}
          if (row.updated_at) timestamps[row.setting_key] = row.updated_at
        })
        setSettings(map)
        setLastUpdated(timestamps)
      }
    } catch {}
    setLoading(false)
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateField = (sectionKey: string, fieldKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [fieldKey]: value },
    }))
    setSaved(prev => ({ ...prev, [sectionKey]: false }))
  }

  const saveSection = async (sectionKey: string) => {
    setSaving(prev => ({ ...prev, [sectionKey]: true }))
    try {
      const value = settings[sectionKey] || {}
      const { error } = await supabase.from('ai_settings').upsert({
        setting_key: sectionKey,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })

      if (!error) {
        setSaved(prev => ({ ...prev, [sectionKey]: true }))
        setLastUpdated(prev => ({ ...prev, [sectionKey]: new Date().toISOString() }))
        setTimeout(() => setSaved(prev => ({ ...prev, [sectionKey]: false })), 2000)
      }
    } catch {}
    setSaving(prev => ({ ...prev, [sectionKey]: false }))
  }

  const toggleMultiSelect = (sectionKey: string, fieldKey: string, value: string) => {
    const current: string[] = settings[sectionKey]?.[fieldKey] || []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateField(sectionKey, fieldKey, next)
  }

  const getAIModeWarning = () => {
    const mode = settings['ai_mode']?.mode
    if (mode === 'fully_autonomous') return { color: 'var(--red)', text: 'FULLY AUTONOMOUS MODE - AI will act without human approval' }
    if (mode === 'ai_assisted') return { color: 'var(--amber)', text: 'AI-ASSISTED MODE - AI drafts actions for human review' }
    return null
  }

  const warning = getAIModeWarning()

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 800,
              fontSize: 28,
              color: 'var(--text1)',
              margin: 0,
            }}>AI Control Center</h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
              Configure V.I.N.Y.L. and all AI-powered features
            </p>
          </div>
        </div>
      </div>

      {/* AI Mode Warning Banner */}
      {warning && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: `${warning.color}15`,
          border: `1px solid ${warning.color}40`,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <AlertTriangle size={18} style={{ color: warning.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: warning.color }}>{warning.text}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13 }}>Loading AI settings...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTIONS.map(section => {
            const isOpen = expandedSections[section.key]
            const Icon = section.icon
            const ts = lastUpdated[section.key]

            return (
              <div
                key={section.key}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Icon size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{section.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{section.description}</div>
                  </div>
                  {ts && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
                      <Clock size={10} />
                      {new Date(ts).toLocaleDateString()}
                    </div>
                  )}
                  {isOpen ? <ChevronDown size={16} style={{ color: 'var(--text3)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text3)' }} />}
                </button>

                {/* Section Content */}
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                      {section.fields.map(field => (
                        <div key={field.key}>
                          {field.type === 'toggle' ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{field.label}</div>
                                {field.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{field.description}</div>}
                              </div>
                              <button
                                onClick={() => updateField(section.key, field.key, !settings[section.key]?.[field.key])}
                                style={{
                                  width: 44,
                                  height: 24,
                                  borderRadius: 12,
                                  background: settings[section.key]?.[field.key] ? 'var(--accent)' : 'var(--surface2)',
                                  border: `1px solid ${settings[section.key]?.[field.key] ? 'var(--accent)' : 'var(--border)'}`,
                                  cursor: 'pointer',
                                  position: 'relative',
                                  transition: 'all 0.2s',
                                  flexShrink: 0,
                                }}
                              >
                                <div style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  position: 'absolute',
                                  top: 2,
                                  left: settings[section.key]?.[field.key] ? 22 : 2,
                                  transition: 'left 0.2s',
                                }} />
                              </button>
                            </div>
                          ) : field.type === 'select' ? (
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{field.label}</label>
                              <select
                                value={settings[section.key]?.[field.key] || ''}
                                onChange={e => updateField(section.key, field.key, e.target.value)}
                                className="field"
                                style={{ marginTop: 6 }}
                              >
                                <option value="">Select...</option>
                                {field.options?.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          ) : field.type === 'multi-select' ? (
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{field.label}</label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                {field.options?.map(opt => {
                                  const selected = (settings[section.key]?.[field.key] || []).includes(opt.value)
                                  return (
                                    <button
                                      key={opt.value}
                                      onClick={() => toggleMultiSelect(section.key, field.key, opt.value)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                                        background: selected ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                                        color: selected ? 'var(--accent)' : 'var(--text2)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ) : field.type === 'slider' ? (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{field.label}</label>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>
                                  {settings[section.key]?.[field.key] || field.min || 1}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={field.min || 1}
                                max={field.max || 5}
                                step={field.step || 1}
                                value={settings[section.key]?.[field.key] || field.min || 1}
                                onChange={e => updateField(section.key, field.key, Number(e.target.value))}
                                style={{ width: '100%', marginTop: 8, accentColor: 'var(--accent)' }}
                              />
                            </div>
                          ) : (
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{field.label}</label>
                              {field.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{field.description}</div>}
                              <input
                                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                                value={settings[section.key]?.[field.key] ?? ''}
                                onChange={e => updateField(section.key, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                placeholder={field.placeholder}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                className="field"
                                style={{ marginTop: 6 }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                      <button
                        onClick={() => saveSection(section.key)}
                        disabled={saving[section.key]}
                        className="btn-primary"
                        style={{ gap: 6 }}
                      >
                        {saving[section.key] ? (
                          <><Loader2 size={14} className="animate-spin" /> Saving...</>
                        ) : saved[section.key] ? (
                          <><Check size={14} /> Saved</>
                        ) : (
                          <><Save size={14} /> Save Changes</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
