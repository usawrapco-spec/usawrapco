// ─── Role types ────────────────────────────────────────────────────────────────
export type UserRole =
  | 'admin'
  | 'sales'
  | 'production'
  | 'installer'
  | 'designer'
  | 'customer'

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
  // Joined fields
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

// ─── RBAC helpers ──────────────────────────────────────────────────────────────
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
  admin: [
    'view_analytics', 'view_financials', 'view_all_projects', 'view_all_agents',
    'view_inventory', 'manage_users', 'manage_settings', 'manage_workflows',
    'edit_projects', 'delete_projects', 'manage_bids', 'sign_off_production',
    'sign_off_install', 'sign_off_sales', 'view_master_mode', 'access_design_studio',
  ],
  sales: [
    'view_financials', 'view_all_projects', 'view_all_agents', 'view_inventory',
    'edit_projects', 'sign_off_sales', 'access_design_studio',
  ],
  production: [
    'view_all_projects', 'view_inventory', 'edit_projects',
    'sign_off_production', 'access_design_studio',
  ],
  installer: [
    'sign_off_install',
  ],
  designer: [
    'access_design_studio',
  ],
  customer: [],
}

export function canAccess(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// ─── Database type stub ────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> }
      files: { Row: ProjectFile; Insert: Partial<ProjectFile>; Update: Partial<ProjectFile> }
    }
  }
}
