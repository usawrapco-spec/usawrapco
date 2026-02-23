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
