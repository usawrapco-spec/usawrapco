'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'
import { ROLE_PERMISSIONS } from '@/types'
import { clsx } from 'clsx'

interface EmployeesClientProps {
  profile: Profile
  initialMembers: Profile[]
}

const ROLE_OPTIONS: { role: UserRole; icon: string; label: string; color: string }[] = [
  { role: 'admin',      icon: '👑', label: 'Admin',      color: 'text-purple' },
  { role: 'sales',      icon: '💼', label: 'Sales',      color: 'text-accent' },
  { role: 'production', icon: '🖨', label: 'Production', color: 'text-green' },
  { role: 'installer',  icon: '🔧', label: 'Installer',  color: 'text-cyan' },
  { role: 'designer',   icon: '🎨', label: 'Designer',   color: 'text-amber' },
  { role: 'customer',   icon: '👤', label: 'Customer',   color: 'text-text3' },
]

export function EmployeesClient({ profile, initialMembers }: EmployeesClientProps) {
  const [members, setMembers] = useState<Profile[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('sales')
  const [saving, setSaving] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
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
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId)
    setSaving(false)
    if (!error) {
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
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

  const roleColor = (role: string) =>
    ROLE_OPTIONS.find(r => r.role === role)?.color || 'text-text3'

  const roleIcon = (role: string) =>
    ROLE_OPTIONS.find(r => r.role === role)?.icon || '👤'

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            👥 Team Members
          </h1>
          <p className="text-sm text-text3 mt-1">
            {members.length} members · {members.filter(m => m.active).length} active
          </p>
        </div>
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
            <div className="text-2xl mb-1">{r.icon}</div>
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
          <div className="text-2xl mb-1">👤</div>
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
            placeholder="Search team members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3">🔍</span>
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
              <th>Permissions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-text3 text-sm">
                  {search ? 'No members matching search.' : 'No team members found.'}
                </td>
              </tr>
            ) : filtered.map(member => (
              <tr key={member.id}>
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
                <td className="text-text2 text-sm">{member.email}</td>
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
                        ✓
                      </button>
                      <button
                        className="btn-ghost btn-xs"
                        onClick={() => setEditingId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className={clsx('font-700 text-sm capitalize flex items-center gap-1.5', roleColor(member.role))}>
                      {roleIcon(member.role)} {member.role}
                    </span>
                  )}
                </td>
                <td>
                  <span className="text-xs text-text3">
                    {ROLE_PERMISSIONS[member.role]?.length || 0} permissions
                  </span>
                </td>
                <td>
                  {member.active ? (
                    <span className="badge badge-green">Active</span>
                  ) : (
                    <span className="badge badge-red">Inactive</span>
                  )}
                </td>
                <td>
                  {member.id !== profile.id && (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
