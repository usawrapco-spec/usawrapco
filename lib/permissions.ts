/**
 * lib/permissions.ts
 * Fine-grained permission helper aligned with the spec roles.
 * Use canAccess() from types/index.ts for sidebar/page-level checks.
 * Use these for feature-level checks within pages.
 */

export type ModulePermission =
  | 'sales.read'
  | 'sales.write'
  | 'jobs.read'
  | 'jobs.write'
  | 'design.read'
  | 'design.write'
  | 'production.read'
  | 'production.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'bids.read'
  | 'bids.manage'
  | 'settings.locked'
  | 'team.manage'
  | 'finances.view'
  | 'expenses.write'
  | 'reports.view'

const PERMISSIONS: Record<string, ModulePermission[]> = {
  owner: [
    'sales.read', 'sales.write', 'jobs.read', 'jobs.write',
    'design.read', 'design.write', 'production.read', 'production.write',
    'inventory.read', 'inventory.write', 'bids.read', 'bids.manage',
    'settings.locked', 'team.manage', 'finances.view', 'expenses.write', 'reports.view',
  ],
  admin: [
    'sales.read', 'sales.write', 'jobs.read', 'jobs.write',
    'design.read', 'design.write', 'production.read', 'production.write',
    'inventory.read', 'inventory.write', 'bids.read', 'bids.manage',
    'settings.locked', 'team.manage', 'finances.view', 'expenses.write', 'reports.view',
  ],
  sales_agent: ['sales.read', 'sales.write', 'jobs.read', 'expenses.write', 'finances.view'],
  designer:    ['design.read', 'design.write', 'jobs.read'],
  production:  [
    'jobs.read', 'jobs.write', 'design.read', 'production.read', 'production.write',
    'inventory.read', 'inventory.write', 'bids.read', 'bids.manage', 'expenses.write',
    'reports.view',
  ],
  installer:   ['jobs.read', 'bids.read', 'inventory.read', 'expenses.write'],
  viewer:      ['jobs.read'],
}

export function hasPermission(role: string, permission: ModulePermission): boolean {
  return (PERMISSIONS[role] ?? []).includes(permission)
}

/** Human-readable label for each role */
export const ROLE_LABELS: Record<string, string> = {
  owner:       'Owner',
  admin:       'Admin',
  sales_agent: 'Sales Agent',
  designer:    'Designer',
  production:  'Production',
  installer:   'Installer',
  viewer:      'Viewer',
}

/** Color for each role */
export const ROLE_COLORS: Record<string, string> = {
  owner:       '#f59e0b',  // amber
  admin:       '#8b5cf6',  // purple
  sales_agent: '#4f7fff',  // blue/accent
  designer:    '#22d3ee',  // cyan
  production:  '#22c07a',  // green
  installer:   '#f59e0b',  // amber
  viewer:      '#5a6080',  // text3/gray
}

/** All valid DB role values */
export const ROLE_OPTIONS = [
  { value: 'admin',       label: 'Admin' },
  { value: 'sales_agent', label: 'Sales Agent' },
  { value: 'designer',    label: 'Designer' },
  { value: 'production',  label: 'Production' },
  { value: 'installer',   label: 'Installer' },
  { value: 'viewer',      label: 'Viewer' },
] as const
