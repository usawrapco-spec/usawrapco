// ─── Role types ────────────────────────────────────────────────────────────────
// These MUST match the DB check constraint on profiles.role
export type UserRole =
  | 'owner'
  | 'admin'
  | 'sales_agent'
  | 'designer'
  | 'production'
  | 'installer'
  | 'viewer'

// ─── Permission names (used for sidebar/page-level RBAC) ──────────────────────
export type Permission =
  | 'view_analytics'
  | 'view_financials'
  | 'view_all_projects'
  | 'view_all_agents'
  | 'view_inventory'
  | 'manage_users'
  | 'manage_settings'
  | 'manage_workflows'
  | 'edit_projects'
  | 'delete_projects'
  | 'manage_bids'
  | 'sign_off_production'
  | 'sign_off_install'
  | 'sign_off_sales'
  | 'view_master_mode'
  | 'access_design_studio'
  | 'create_estimates'
  | 'approve_estimates'
  | 'manage_customers'
  | 'view_media'
  | 'upload_media'
  | 'delete_media'
  | 'manage_invoices'
  | 'view_payroll'
  | 'manage_payroll'
  | 'view_commissions'
  | 'manage_campaigns'
  | 'view_reports'
  | 'manage_sourcing'

// All permissions available in the system for settings UI
export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  // Projects
  { key: 'view_all_projects', label: 'View All Projects', group: 'Projects' },
  { key: 'edit_projects', label: 'Edit Projects', group: 'Projects' },
  { key: 'delete_projects', label: 'Delete Projects', group: 'Projects' },
  // Pipeline Sign-offs
  { key: 'sign_off_sales', label: 'Sign Off Sales', group: 'Pipeline' },
  { key: 'sign_off_production', label: 'Sign Off Production', group: 'Pipeline' },
  { key: 'sign_off_install', label: 'Sign Off Install', group: 'Pipeline' },
  // Estimates & Sales
  { key: 'create_estimates', label: 'Create Estimates', group: 'Estimates' },
  { key: 'approve_estimates', label: 'Approve Estimates', group: 'Estimates' },
  { key: 'manage_customers', label: 'Manage Customers', group: 'Estimates' },
  { key: 'manage_invoices', label: 'Manage Invoices', group: 'Estimates' },
  // Design
  { key: 'access_design_studio', label: 'Access Design Studio', group: 'Design' },
  { key: 'manage_bids', label: 'Manage Bids', group: 'Design' },
  // Inventory & Media
  { key: 'view_inventory', label: 'View Inventory', group: 'Inventory' },
  { key: 'view_media', label: 'View Media Library', group: 'Media' },
  { key: 'upload_media', label: 'Upload Media', group: 'Media' },
  { key: 'delete_media', label: 'Delete Media', group: 'Media' },
  // Analytics & Reports
  { key: 'view_analytics', label: 'View Analytics', group: 'Analytics' },
  { key: 'view_financials', label: 'View Financials', group: 'Analytics' },
  { key: 'view_reports', label: 'View Reports', group: 'Analytics' },
  { key: 'view_commissions', label: 'View Commissions', group: 'Analytics' },
  // Admin
  { key: 'view_all_agents', label: 'View All Agents', group: 'Admin' },
  { key: 'manage_users', label: 'Manage Users', group: 'Admin' },
  { key: 'manage_settings', label: 'Manage Settings', group: 'Admin' },
  { key: 'manage_workflows', label: 'Manage Workflows', group: 'Admin' },
  { key: 'view_master_mode', label: 'View Master Mode', group: 'Admin' },
  { key: 'view_payroll', label: 'View Payroll', group: 'Admin' },
  { key: 'manage_payroll', label: 'Manage Payroll', group: 'Admin' },
  { key: 'manage_campaigns', label: 'Manage Campaigns', group: 'Admin' },
  { key: 'manage_sourcing', label: 'Manage Sourcing', group: 'Admin' },
]

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'view_analytics', 'view_financials', 'view_all_projects', 'view_all_agents',
    'view_inventory', 'manage_users', 'manage_settings', 'manage_workflows',
    'edit_projects', 'delete_projects', 'manage_bids', 'sign_off_production',
    'sign_off_install', 'sign_off_sales', 'view_master_mode', 'access_design_studio',
    'create_estimates', 'approve_estimates', 'manage_customers', 'view_media',
    'upload_media', 'delete_media', 'manage_invoices', 'view_payroll', 'manage_payroll',
    'view_commissions', 'manage_campaigns', 'view_reports', 'manage_sourcing',
  ],
  admin: [
    'view_analytics', 'view_financials', 'view_all_projects', 'view_all_agents',
    'view_inventory', 'manage_users', 'manage_settings', 'manage_workflows',
    'edit_projects', 'delete_projects', 'manage_bids', 'sign_off_production',
    'sign_off_install', 'sign_off_sales', 'view_master_mode', 'access_design_studio',
    'create_estimates', 'approve_estimates', 'manage_customers', 'view_media',
    'upload_media', 'delete_media', 'manage_invoices', 'view_payroll', 'manage_payroll',
    'view_commissions', 'manage_campaigns', 'view_reports', 'manage_sourcing',
  ],
  sales_agent: [
    'view_financials', 'view_all_projects', 'view_all_agents',
    'edit_projects', 'sign_off_sales', 'create_estimates', 'manage_customers',
    'view_media', 'upload_media', 'view_commissions', 'view_reports',
  ],
  designer: [
    'access_design_studio', 'view_all_projects', 'view_media', 'upload_media',
  ],
  production: [
    'view_all_projects', 'view_inventory', 'edit_projects',
    'sign_off_production', 'access_design_studio', 'manage_bids',
    'view_media', 'upload_media',
  ],
  installer: [
    'sign_off_install', 'view_all_projects', 'view_inventory',
    'view_media', 'upload_media',
  ],
  viewer: ['view_media'],
}

export function canAccess(role: UserRole | string, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role as UserRole] ?? []).includes(permission)
}

export function isAdminRole(role: UserRole | string): boolean {
  return role === 'owner' || role === 'admin'
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  org_id: string
  role: UserRole
  is_owner?: boolean
  name: string
  display_name?: string | null
  email: string
  phone: string | null
  avatar_url: string | null
  permissions: Record<string, boolean>
  active: boolean
  division?: string | null
  last_active_date?: string | null
  // Gamification / XP
  xp?: number | null
  level?: number | null
  current_streak?: number | null
  longest_streak?: number | null
  monthly_xp?: number | null
  weekly_xp?: number | null
  badges?: string[] | null
  created_at: string
  updated_at: string
}

// ─── Project ───────────────────────────────────────────────────────────────────
export type ProjectType = 'wrap' | 'decking' | 'design' | 'ppf'
export type ProjectStatus =
  | 'estimate'
  | 'active'
  | 'in_production'
  | 'install_scheduled'
  | 'installed'
  | 'qc'
  | 'closing'
  | 'closed'
  | 'cancelled'

export type PipeStage =
  | 'sales_in'
  | 'production'
  | 'install'
  | 'prod_review'
  | 'sales_close'
  | 'done'

export interface ProjectFinancials {
  sales: number
  cogs: number
  profit: number
  gpm: number
  commission: number
  labor: number
  laborHrs: number
  material: number
  designFee: number
  misc: number
}

export interface Project {
  id: string
  org_id: string
  type: ProjectType
  title: string
  status: ProjectStatus
  customer_id: string | null
  agent_id: string | null
  installer_id: string | null
  current_step_id: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  vehicle_desc: string | null
  install_date: string | null
  due_date: string | null
  revenue: number | null
  profit: number | null
  gpm: number | null
  commission: number | null
  division: 'wraps' | 'decking'
  pipe_stage: PipeStage
  form_data: Record<string, unknown>
  fin_data: ProjectFinancials | null
  actuals: Record<string, unknown>
  checkout: Record<string, boolean>
  installer_bid: InstallerBid | null
  send_backs: SendBack[]
  referral: string | null
  created_at: string
  updated_at: string
  agent?: Pick<Profile, 'id' | 'name' | 'email'>
  installer?: Pick<Profile, 'id' | 'name' | 'email'>
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
}

export interface InstallerBid {
  status: 'none' | 'pending' | 'accepted' | 'declined'
  sentAt?: string
  acceptedBy?: string
  acceptedAt?: string
  declinedBy?: string
  declinedAt?: string
  offeredRate?: number
  targetRate?: number
  passiveMargin?: number
}

export interface SendBack {
  from: string
  to: string
  reason: string
  note: string
  at: string
}

// ─── Task ──────────────────────────────────────────────────────────────────────
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'dismissed'
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type TaskType = 'manual' | 'auto' | 'ai_suggested' | 'reminder'

export interface Task {
  id: string
  org_id: string
  project_id: string | null
  assigned_to: string | null
  created_by: string | null
  title: string
  description: string | null
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  done_at: string | null
  source: string | null
  created_at: string
  updated_at: string
  project?: Pick<Project, 'id' | 'title' | 'vehicle_desc'>
  assignee?: Pick<Profile, 'id' | 'name'>
}

// ─── File ──────────────────────────────────────────────────────────────────────
export type FileType = 'photo' | 'proof' | 'pdf' | 'export' | 'reference' | 'other'

export interface ProjectFile {
  id: string
  org_id: string
  project_id: string
  uploaded_by: string | null
  bucket_path: string
  file_name: string
  file_type: FileType
  mime_type: string | null
  size_bytes: number | null
  version: number
  parent_file_id: string | null
  is_current: boolean
  is_customer_visible: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Design Project ────────────────────────────────────────────────────────────
export type DesignProjectStatus = 'brief' | 'in_progress' | 'proof_sent' | 'approved'
export type DesignType = 'full_wrap' | 'partial_wrap' | 'decal' | 'livery' | 'color_change' | 'other'

export interface DesignProject {
  id: string
  org_id: string
  client_name: string
  design_type: DesignType
  description: string | null
  deadline: string | null
  status: DesignProjectStatus
  project_id: string | null
  designer_id: string | null
  assigned_to?: string | null
  created_by: string | null
  title?: string | null
  notes?: string | null
  vehicle_type?: string | null
  brand_files?: Record<string, unknown> | null
  design_canvas_data?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  linked_project?: Pick<Project, 'id' | 'title'>
  creator?: Pick<Profile, 'id' | 'name'>
}

// ─── Team Invite ───────────────────────────────────────────────────────────────
export interface TeamInvite {
  id: string
  org_id: string
  email: string
  role: UserRole
  invited_by: string | null
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  created_at: string
  accepted_at: string | null
}

// ─── Estimate (Quote) ────────────────────────────────────────────────────────
export type EstimateStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'void' | 'rejected'

export interface Estimate {
  id: string
  org_id: string
  estimate_number: string
  title?: string
  customer_id: string | null
  contact_id: string | null
  status: EstimateStatus
  sales_rep_id: string | null
  production_manager_id: string | null
  project_manager_id: string | null
  line_items: any[]
  subtotal: number
  discount: number
  discount_percent: number
  discount_amount: number
  tax_rate: number
  tax_percent: number
  tax_amount: number
  total: number
  notes: string | null
  customer_note?: string | null
  internal_notes: string | null
  tags: string[]
  division?: string | null
  form_data?: Record<string, unknown>
  quote_date: string | null
  due_date: string | null
  expires_at: string | null
  ordered: boolean
  invoiced: boolean
  converted_to_so_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
  sales_rep?: Pick<Profile, 'id' | 'name'>
  sales_order?: Pick<SalesOrder, 'id' | 'so_number'>
}

export interface LineItem {
  id: string
  parent_type: 'estimate' | 'sales_order' | 'invoice' | 'project'
  parent_id: string
  product_type: ProjectType
  name: string
  description: string | null
  quantity: number
  unit_price: number
  unit_discount: number
  total_price: number
  specs: LineItemSpecs
  sort_order: number
  created_at: string
}

export interface LineItemSpecs {
  vehicleYear?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleColor?: string
  vehicleType?: string
  vehicleCategory?: string
  wrapType?: string
  vinylType?: string
  laminate?: string
  windowPerf?: boolean
  vinylArea?: number
  perfArea?: number
  complexity?: number
  materialCost?: number
  laborCost?: number
  laborPrice?: number
  laborHours?: number
  laborRate?: number
  machineCost?: number
  designFee?: number
  miscCost?: number
  flatRate?: number
  estimatedHours?: number
  cogs?: number
  gp?: number
  gpm?: number
  commissionRate?: number
  commissionAmount?: number
  notes?: string
  designDetails?: string
  productionDetails?: string
  installDetails?: string
  customerDescription?: string
  optionId?: string
  [key: string]: unknown
}

export type SalesOrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'void'

export interface SalesOrder {
  id: string
  org_id: string
  so_number: string
  title?: string
  estimate_id: string | null
  customer_id: string | null
  contact_id: string | null
  invoice_contact_id: string | null
  status: SalesOrderStatus
  sales_rep_id: string | null
  production_manager_id: string | null
  project_manager_id: string | null
  designer_id?: string | null
  line_items: any[]
  subtotal: number
  discount: number
  discount_percent: number
  discount_amount: number
  tax_rate: number
  tax_percent: number
  tax_amount: number
  total: number
  notes: string | null
  internal_notes: string | null
  form_data?: Record<string, unknown>
  tags: string[]
  install_date?: string | null
  payment_terms?: string | null
  down_payment_pct?: number | null
  so_date: string | null
  due_date: string | null
  invoiced: boolean
  converted_to_invoice_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
  sales_rep?: Pick<Profile, 'id' | 'name'>
  estimate?: Pick<Estimate, 'id' | 'estimate_number'>
  invoice?: Pick<Invoice, 'id' | 'invoice_number'>
}

export type InvoiceStatus = 'draft' | 'open' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'

export interface Invoice {
  id: string
  org_id: string
  invoice_number: string
  title?: string
  estimate_id: string | null
  so_id: string | null
  sales_order_id?: string | null
  customer_id: string | null
  contact_id: string | null
  invoice_contact_id: string | null
  status: InvoiceStatus
  sales_rep_id: string | null
  line_items: any[]
  subtotal: number
  discount: number
  discount_amount: number
  tax_rate: number
  tax_percent: number
  tax_amount: number
  total: number
  amount_paid: number
  balance: number
  balance_due?: number
  notes: string | null
  form_data?: Record<string, unknown>
  payment_terms: string
  invoice_date: string | null
  due_date: string | null
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
  sales_rep?: Pick<Profile, 'id' | 'name'>
  estimate?: Pick<Estimate, 'id' | 'estimate_number'>
  sales_order?: Pick<SalesOrder, 'id' | 'so_number'>
  payments?: Payment[]
}

export interface Payment {
  id: string
  org_id: string
  invoice_id: string
  customer_id: string | null
  amount: number
  method: 'cash' | 'check' | 'card' | 'stripe' | 'zelle' | 'venmo' | 'ach' | 'wire' | 'other'
  reference_number: string | null
  notes: string | null
  recorded_by: string | null
  payment_date: string
  created_at: string
  recorder?: Pick<Profile, 'id' | 'name'>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
export type ActorType = 'user' | 'customer' | 'system' | 'ai'

export interface ActivityEntry {
  id: string
  org_id: string
  job_id: string | null
  estimate_id: string | null
  customer_id: string | null
  actor_type: ActorType
  actor_id: string | null
  actor_name: string
  action: string
  details: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Estimate Templates ───────────────────────────────────────────────────────
export interface EstimateTemplate {
  id: string
  org_id: string
  name: string
  description: string | null
  category: string | null
  line_items: LineItem[]
  form_data: Record<string, unknown>
  created_by: string | null
  use_count: number
  created_at: string
  updated_at: string
}

// ─── Estimate Options (Proposal Mode) ─────────────────────────────────────────
export interface EstimateOption {
  id: string
  estimate_id: string
  label: string
  sort_order: number
  selected: boolean
  line_item_ids: string[]
  created_at: string
}

// ─── Job History (Auto-Quoting) ───────────────────────────────────────────────
export interface JobHistory {
  id: string
  org_id: string
  vehicle_type: string | null
  vehicle_year: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  wrap_type: string | null
  material: string | null
  sqft: number | null
  sale_price: number | null
  cogs: number | null
  gpm: number | null
  install_hours: number | null
  customer_id: string | null
  completed_at: string | null
  created_at: string
}

// ─── Prospect ─────────────────────────────────────────────────────────────────
export type ProspectStatus = 'new' | 'contacted' | 'replied' | 'interested' | 'converted' | 'dead' | 'hot' | 'warm' | 'cold'
export type ProspectSource = 'google_places' | 'cold_call' | 'door_knock' | 'referral' | 'event' | 'social_media' | 'website' | 'other'

export interface Prospect {
  id: string
  org_id: string
  name: string
  business_name: string | null
  company: string | null
  industry: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  linkedin: string | null
  instagram: string | null
  facebook: string | null
  google_rating: number | null
  google_maps_url: string | null
  status: ProspectStatus
  source: ProspectSource
  score: number | null
  campaign_id: string | null
  assigned_to: string | null
  fleet_size: number | null
  estimated_revenue: number | null
  notes: string | null
  tags: string[]
  follow_up_date: string | null
  last_contact: string | null
  last_contacted_at: string | null
  converted_customer_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
  assignee?: Pick<Profile, 'id' | 'name'>
}

// ─── Campaign ─────────────────────────────────────────────────────────────────
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'

export interface CampaignStep {
  step_number: number
  subject: string
  body: string
  delay_days: number
}

export interface Campaign {
  id: string
  org_id: string
  name: string
  industry_target: string | null
  status: CampaignStatus
  email_sequence: CampaignStep[]
  auto_reply: boolean
  stats: {
    sent: number
    opened: number
    replied: number
    bounced: number
    conversions: number
  }
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CampaignMessage {
  id: string
  org_id: string
  campaign_id: string
  prospect_id: string
  step_number: number
  subject: string
  body: string
  status: 'queued' | 'sent' | 'opened' | 'replied' | 'bounced' | 'failed'
  sent_at: string | null
  opened_at: string | null
  replied_at: string | null
  reply_text: string | null
  ai_draft_reply: string | null
  scheduled_for: string | null
  created_at: string
}

export interface AIActivity {
  id: string
  org_id: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown>
  created_at: string
}

// ─── V.I.N.Y.L. AI Sales Broker ──────────────────────────────────────────────

export type ConversationChannel = 'sms' | 'email' | 'web_chat'
export type ConversationStatus = 'active' | 'escalated' | 'closed' | 'converted'
export type LeadStage = 'new' | 'qualifying' | 'quoting' | 'negotiating' | 'deposit_sent' | 'converted' | 'lost'
export type MessageRole = 'customer' | 'ai' | 'human_agent'

export interface Conversation {
  id: string
  org_id: string
  customer_id: string | null
  channel: ConversationChannel
  phone_number: string | null
  email_address: string | null
  status: ConversationStatus
  escalation_reason: string | null
  escalated_to: string | null
  ai_enabled: boolean
  lead_stage: LeadStage
  vehicle_info: Record<string, unknown>
  wrap_preferences: Record<string, unknown>
  quote_data: Record<string, unknown>
  created_at: string
  updated_at: string
  customer?: { id: string; name: string; email?: string; phone?: string; company_name?: string }
  messages?: ConversationMessage[]
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  channel: ConversationChannel
  ai_reasoning: string | null
  ai_confidence: number | null
  tokens_used: number | null
  cost_cents: number | null
  external_id: string | null
  created_at: string
}

export type EscalationRuleType = 'keyword' | 'sentiment' | 'dollar_threshold' | 'explicit_request' | 'confidence'

export interface EscalationRule {
  id: string
  org_id: string
  rule_type: EscalationRuleType
  rule_config: Record<string, unknown>
  notify_channel: 'slack' | 'sms'
  notify_target: string | null
  is_active: boolean
  priority: number
  created_at: string
}

export type PlaybookCategory = 'greeting' | 'qualification' | 'pricing' | 'objection' | 'upsell' | 'closing' | 'followup' | 'faq' | 'policy' | 'competitor' | 'brand_voice'

export interface PlaybookEntry {
  id: string
  org_id: string
  category: PlaybookCategory
  trigger_phrase: string | null
  response_guidance: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface PricingRule {
  id: string
  org_id: string
  vehicle_category: string
  wrap_type: string
  base_price: number
  price_per_sqft: number
  max_discount_pct: number
  rush_multiplier: Record<string, number>
  complexity_multiplier: Record<string, number>
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Database type stub ────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles:     { Row: Profile;     Insert: Partial<Profile>;     Update: Partial<Profile> }
      projects:     { Row: Project;     Insert: Partial<Project>;     Update: Partial<Project> }
      tasks:        { Row: Task;        Insert: Partial<Task>;        Update: Partial<Task> }
      files:        { Row: ProjectFile; Insert: Partial<ProjectFile>; Update: Partial<ProjectFile> }
      team_invites: { Row: TeamInvite;  Insert: Partial<TeamInvite>;  Update: Partial<TeamInvite> }
      estimates:    { Row: Estimate;    Insert: Partial<Estimate>;    Update: Partial<Estimate> }
      sales_orders: { Row: SalesOrder;  Insert: Partial<SalesOrder>;  Update: Partial<SalesOrder> }
      invoices:     { Row: Invoice;     Insert: Partial<Invoice>;     Update: Partial<Invoice> }
      line_items:   { Row: LineItem;    Insert: Partial<LineItem>;    Update: Partial<LineItem> }
    }
  }
}
