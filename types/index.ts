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

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'view_analytics', 'view_financials', 'view_all_projects', 'view_all_agents',
    'view_inventory', 'manage_users', 'manage_settings', 'manage_workflows',
    'edit_projects', 'delete_projects', 'manage_bids', 'sign_off_production',
    'sign_off_install', 'sign_off_sales', 'view_master_mode', 'access_design_studio',
  ],
  admin: [
    'view_analytics', 'view_financials', 'view_all_projects', 'view_all_agents',
    'view_inventory', 'manage_users', 'manage_settings', 'manage_workflows',
    'edit_projects', 'delete_projects', 'manage_bids', 'sign_off_production',
    'sign_off_install', 'sign_off_sales', 'view_master_mode', 'access_design_studio',
  ],
  sales_agent: [
    'view_financials', 'view_all_projects', 'view_all_agents',
    'edit_projects', 'sign_off_sales',
  ],
  designer: [
    'access_design_studio', 'view_all_projects',
  ],
  production: [
    'view_all_projects', 'view_inventory', 'edit_projects',
    'sign_off_production', 'access_design_studio', 'manage_bids',
  ],
  installer: [
    'sign_off_install', 'view_all_projects', 'view_inventory',
  ],
  viewer: [],
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
  name: string
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
  linked_project_id: string | null
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  linked_project?: Pick<Project, 'id' | 'title'>
  creator?: Pick<Profile, 'id' | 'name'>
  assignee?: Pick<Profile, 'id' | 'name'>
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
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'expired' | 'rejected' | 'void'

export interface Estimate {
  id: string
  org_id: string
  estimate_number: number
  title: string
  customer_id: string | null
  status: EstimateStatus
  sales_rep_id: string | null
  production_manager_id: string | null
  project_manager_id: string | null
  quote_date: string | null
  due_date: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  customer_note: string | null
  division: 'wraps' | 'decking'
  form_data: Record<string, unknown>
  created_at: string
  updated_at: string
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
  sales_rep?: Pick<Profile, 'id' | 'name'>
  line_items?: LineItem[]
}

export interface LineItem {
  id: string
  parent_type: 'estimate' | 'sales_order' | 'invoice'
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

export type SalesOrderStatus = 'new' | 'in_progress' | 'completed' | 'on_hold' | 'void'

export interface SalesOrder {
  id: string
  org_id: string
  so_number: number
  title: string
  estimate_id: string | null
  customer_id: string | null
  status: SalesOrderStatus
  sales_rep_id: string | null
  production_manager_id: string | null
  project_manager_id: string | null
  designer_id: string | null
  so_date: string | null
  due_date: string | null
  install_date: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  down_payment_pct: number
  payment_terms: string | null
  notes: string | null
  invoiced: boolean
  form_data: Record<string, unknown>
  created_at: string
  updated_at: string
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
  sales_rep?: Pick<Profile, 'id' | 'name'>
  estimate?: Pick<Estimate, 'id' | 'estimate_number'>
  line_items?: LineItem[]
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'

export interface Invoice {
  id: string
  org_id: string
  invoice_number: number
  title: string
  sales_order_id: string | null
  customer_id: string | null
  status: InvoiceStatus
  invoice_date: string | null
  due_date: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number
  notes: string | null
  form_data: Record<string, unknown>
  created_at: string
  updated_at: string
  customer?: Pick<Profile, 'id' | 'name' | 'email'>
  sales_order?: Pick<SalesOrder, 'id' | 'so_number'>
  line_items?: LineItem[]
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
