'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'
import { ROLE_PERMISSIONS } from '@/types'
import { clsx } from 'clsx'
import { Crown, Briefcase, Printer, Wrench, Palette, User, Search, Check, X, type LucideIcon } from 'lucide-react'

interface EmployeesClientProps {
  profile: Profile
  initialMembers: Profile[]
  projectCounts?: Record<string, number>
}

const ROLE_OPTIONS: { role: UserRole; Icon: LucideIcon; label: string; color: string; badgeClass: string }[] = [
  { role: 'admin',      Icon: Crown,    label: 'Admin',      color: 'text-purple', badgeClass: 'badge-purple' },
  { role: 'sales',      Icon: Briefcase,label: 'Sales',      color: 'text-accent',  badgeClass: 'badge-accent' },
  { role: 'production', Icon: Printer,  label: 'Production', color: 'text-green',   badgeClass: 'badge-green' },
  { role: 'installer',  Icon: Wrench,   label: 'Installer',  color: 'text-cyan',    badgeClass: 'badge-accent' },
  { role: 'designer',   Icon: Palette,  label: 'Designer',   color: 'text-amber',   badgeClass: 'badge-amber' },
  { role: 'customer',   Icon: User,     label: 'Customer',   color: 'text-text3',   badgeClass: 'badge-gray' },
]

const PERMISSION_LABELS: Record<string, string> = {
  view_analytics: 'Analytics',
  view_financials: 'Financials',
  view_all_projects: 'All Projects',
  view_all_agents: 'All Agents',
  view_inventory: 'Inventory',
  manage_users: 'Manage Users',
  manage_settings: 'Settings',
  manage_workflows: 'Workflows',
  edit_projects: 'Edit Projects',
  delete_projects: 'Delete Projects',
  manage_bids: 'Bids',
  sign_off_production: 'Sign-off Prod',
  sign_off_install: 'Sign-off Install',
  sign_off_sales: 'Sign-off Sales',
  view_master_mode: 'Master Mode',
  access_design_studio: 'Design Studio',
}

interface NewMemberForm {
  name: string
  email: string
  phone: string
  role: UserRole
}

const EMPTY_FORM: NewMemberForm = { name: '', email: '', phone: '', role: 'sales' }

export function EmployeesClient({ profile, initialMembers, projectCounts = {} }: EmployeesClientProps) {
  const [members, setMembers] = useState<Profile[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('sales')
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMember, setNewMember] = useState<NewMemberForm>(EMPTY_FORM)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null)
  const supabase = createClient()

  const filtered = useMemo(() => {
    let list = [...members]
    if (roleFilter !== 'all') list = list.filter(m => m.role === roleFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [members, roleFilter, search])

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    members.forEach(m => { counts[m.role] = (counts[m.role] || 0) + 1 })
    return counts
  }, [members])

  async function updateRole(memberId: string, newRole: UserRole) {
    setSaving(true)
    const permissions: Record<string, boolean> = {}
    ROLE_PERMISSIONS[newRole].forEach(p => { permissions[p] = true })

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, permissions })
      .eq('id', memberId)
    setSaving(false)
    if (!error) {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole, permissions } : m
      ))
      setEditingId(null)
    }
  }

  async function toggleActive(memberId: string, active: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', memberId)
    if (!error) {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, active } : m
      ))
    }
  }

  async function handleAddMember() {
    setAddError(null)

    if (!newMember.name.trim()) {
      setAddError('Name is required.')
      return
    }
    if (!newMember.email.trim()) {
      setAddError('Email is required.')
      return
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMember.email.trim())) {
      setAddError('Please enter a valid email address.')
      return
    }
    // Check for duplicate email
    if (members.some(m => m.email.toLowerCase() === newMember.email.trim().toLowerCase())) {
      setAddError('A team member with this email already exists.')
      return
    }

    setAddSaving(true)

    const permissions: Record<string, boolean> = {}
    ROLE_PERMISSIONS[newMember.role].forEach(p => { permissions[p] = true })

    const newId = crypto.randomUUID()
    const now = new Date().toISOString()

    const record = {
      id: newId,
      org_id: profile.org_id,
      name: newMember.name.trim(),
      email: newMember.email.trim().toLowerCase(),
      phone: newMember.phone.trim() || null,
      role: newMember.role,
      permissions,
      active: true,
      avatar_url: null,
      created_at: now,
      updated_at: now,
    }

    const { error } = await supabase.from('profiles').insert(record)
    setAddSaving(false)

    if (error) {
      setAddError(error.message)
      return
    }

    setMembers(prev => [...prev, record as Profile])
    setNewMember(EMPTY_FORM)
    setShowAddModal(false)
  }

  const roleColor = (role: string) =>
    ROLE_OPTIONS.find(r => r.role === role)?.color || 'text-text3'

  const RoleIcon = ({ role }: { role: string }) => {
    const Ic = ROLE_OPTIONS.find(r => r.role === role)?.Icon || User
    return <Ic size={12} />
  }

  const roleBadge = (role: string) =>
    ROLE_OPTIONS.find(r => r.role === role)?.badgeClass || 'badge-gray'

  const roleLabel = (role: string) =>
    ROLE_OPTIONS.find(r => r.role === role)?.label || role

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Team Members
          </h1>
          <p className="text-sm text-text3 mt-1">
            {members.length} members &middot; {members.filter(m => m.active).length} active
          </p>
        </div>
        {profile.role === 'admin' && (
          <button
            className="btn-primary btn-sm flex items-center gap-2"
            onClick={() => {
              setNewMember(EMPTY_FORM)
              setAddError(null)
              setShowAddModal(true)
            }}
          >
            <span className="text-lg leading-none">+</span>
            Add Team Member
          </button>
        )}
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {ROLE_OPTIONS.filter(r => r.role !== 'customer').map(r => (
          <button
            key={r.role}
            onClick={() => setRoleFilter(roleFilter === r.role ? 'all' : r.role)}
            className={clsx(
              'card text-center py-3 transition-all cursor-pointer',
              roleFilter === r.role ? 'border-accent bg-accent/5' : 'hover:border-accent/30'
            )}
          >
            <div className={clsx('flex justify-center mb-1', r.color)}><r.Icon size={20} /></div>
            <div className={clsx('text-xl font-900 mono', r.color)}>
              {roleCounts[r.role] || 0}
            </div>
            <div className="text-xs text-text3 font-600 mt-0.5">{r.label}</div>
          </button>
        ))}
        <button
          onClick={() => setRoleFilter(roleFilter === 'customer' ? 'all' : 'customer')}
          className={clsx(
            'card text-center py-3 transition-all cursor-pointer',
            roleFilter === 'customer' ? 'border-accent bg-accent/5' : 'hover:border-accent/30'
          )}
        >
          <div className="flex justify-center mb-1 text-text3"><User size={20} /></div>
          <div className="text-xl font-900 mono text-text3">
            {roleCounts['customer'] || 0}
          </div>
          <div className="text-xs text-text3 font-600 mt-0.5">Customers</div>
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            className="field pl-8"
            placeholder="Search team members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3" />
        </div>
        {roleFilter !== 'all' && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => setRoleFilter('all')}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Members table */}
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active Jobs</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text3 text-sm">
                  {search ? 'No members matching search.' : 'No team members found.'}
                </td>
              </tr>
            ) : filtered.map(member => {
              const perms = ROLE_PERMISSIONS[member.role] || []
              const isExpanded = expandedPerms === member.id

              return (
                <tr key={member.id}>
                  {/* Name + avatar */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-800 shrink-0',
                        member.active ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text3'
                      )}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-700 text-text1 text-sm">{member.name}</div>
                        {member.phone && (
                          <div className="text-xs text-text3">{member.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="text-text2 text-sm">{member.email}</td>

                  {/* Role */}
                  <td>
                    {editingId === member.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="field text-xs py-1 w-28"
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as UserRole)}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.role} value={r.role}>{r.label}</option>
                          ))}
                        </select>
                        <button
                          className="btn-primary btn-xs"
                          disabled={saving}
                          onClick={() => updateRole(member.id, editRole)}
                        >
                          {saving ? '...' : <Check size={12} />}
                        </button>
                        <button
                          className="btn-ghost btn-xs"
                          onClick={() => setEditingId(null)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className={clsx('badge text-xs font-700 capitalize flex items-center gap-1', roleBadge(member.role))}>
                        <RoleIcon role={member.role} /> {roleLabel(member.role)}
                      </span>
                    )}
                  </td>

                  {/* Active Jobs */}
                  <td>
                    <span className="mono text-sm font-700 text-text1">
                      {projectCounts[member.id] ?? 0}
                    </span>
                  </td>

                  {/* Permissions */}
                  <td>
                    {perms.length === 0 ? (
                      <span className="text-xs text-text3">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(isExpanded ? perms : perms.slice(0, 3)).map(p => (
                          <span
                            key={p}
                            className="badge badge-gray text-[10px] leading-tight"
                            title={p}
                          >
                            {PERMISSION_LABELS[p] || p}
                          </span>
                        ))}
                        {perms.length > 3 && (
                          <button
                            className="badge badge-gray text-[10px] leading-tight cursor-pointer hover:bg-accent/20"
                            onClick={() => setExpandedPerms(isExpanded ? null : member.id)}
                          >
                            {isExpanded ? 'show less' : `+${perms.length - 3} more`}
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    {member.active ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-red">Inactive</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    {member.id !== profile.id && profile.role === 'admin' && (
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-ghost btn-xs"
                          onClick={() => {
                            setEditingId(member.id)
                            setEditRole(member.role)
                          }}
                        >
                          Edit Role
                        </button>
                        <button
                          className={clsx('btn-xs', member.active ? 'btn-ghost' : 'btn-primary')}
                          onClick={() => toggleActive(member.id, !member.active)}
                        >
                          {member.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add Team Member Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}
        >
          <div
            className="card w-full max-w-md p-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--surface2)' }}
          >
            <h2
              className="text-xl font-900 text-text1 mb-5"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Add Team Member
            </h2>

            {/* Name */}
            <label className="section-label mb-1 block">Name *</label>
            <input
              type="text"
              className="field mb-3 w-full"
              placeholder="Full name"
              value={newMember.name}
              onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))}
            />

            {/* Email */}
            <label className="section-label mb-1 block">Email *</label>
            <input
              type="email"
              className="field mb-3 w-full"
              placeholder="email@example.com"
              value={newMember.email}
              onChange={e => setNewMember(prev => ({ ...prev, email: e.target.value }))}
            />

            {/* Phone */}
            <label className="section-label mb-1 block">Phone</label>
            <input
              type="tel"
              className="field mb-3 w-full"
              placeholder="(optional)"
              value={newMember.phone}
              onChange={e => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
            />

            {/* Role */}
            <label className="section-label mb-1 block">Role</label>
            <select
              className="field mb-2 w-full"
              value={newMember.role}
              onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value as UserRole }))}
            >
              {ROLE_OPTIONS.filter(r => r.role !== 'customer').map(r => (
                <option key={r.role} value={r.role}>{r.label}</option>
              ))}
            </select>

            {/* Permission preview for selected role */}
            <div className="mb-4 mt-1">
              <p className="text-[11px] text-text3 mb-1.5">
                Permissions for {roleLabel(newMember.role)}:
              </p>
              <div className="flex flex-wrap gap-1">
                {ROLE_PERMISSIONS[newMember.role].length === 0 ? (
                  <span className="text-[11px] text-text3">No permissions</span>
                ) : (
                  ROLE_PERMISSIONS[newMember.role].map(p => (
                    <span key={p} className="badge badge-gray text-[10px] leading-tight">
                      {PERMISSION_LABELS[p] || p}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Error */}
            {addError && (
              <div
                className="text-sm mb-3 px-3 py-2 rounded"
                style={{ backgroundColor: 'var(--red)', color: '#fff', opacity: 0.9 }}
              >
                {addError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-2">
              <button
                className="btn-ghost btn-sm"
                onClick={() => setShowAddModal(false)}
                disabled={addSaving}
              >
                Cancel
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={handleAddMember}
                disabled={addSaving}
              >
                {addSaving ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
