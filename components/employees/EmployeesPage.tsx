'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'
import { ROLE_PERMISSIONS } from '@/types'
import {
  Search,
  Plus,
  X,
  Edit2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Briefcase,
  Wrench,
  Palette,
  Printer,
  ChevronDown,
} from 'lucide-react'

interface EmployeesPageProps {
  profile: any
}

interface TeamMember extends Profile {
  job_count?: number
}

const ROLE_OPTIONS: { role: UserRole; label: string; color: string }[] = [
  { role: 'admin',      label: 'Admin',      color: '#8b5cf6' },
  { role: 'sales',      label: 'Sales',      color: '#4f7fff' },
  { role: 'production', label: 'Production', color: '#22c07a' },
  { role: 'designer',   label: 'Designer',   color: '#f59e0b' },
  { role: 'installer',  label: 'Installer',  color: '#22d3ee' },
]

function getRoleIcon(role: string, size = 14) {
  switch (role) {
    case 'admin': return <ShieldCheck size={size} />
    case 'sales': return <Briefcase size={size} />
    case 'production': return <Printer size={size} />
    case 'designer': return <Palette size={size} />
    case 'installer': return <Wrench size={size} />
    default: return <Users size={size} />
  }
}

function getRoleColor(role: string): string {
  return ROLE_OPTIONS.find(r => r.role === role)?.color || '#5a6080'
}

interface MemberForm {
  name: string
  email: string
  phone: string
  role: UserRole
}

const EMPTY_FORM: MemberForm = { name: '', email: '', phone: '', role: 'sales' }

export default function EmployeesPage({ profile }: EmployeesPageProps) {
  const supabase = createClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load team members
  useEffect(() => {
    loadTeam()
  }, [])

  async function loadTeam() {
    setLoading(true)
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('name')

    if (profErr || !profiles) {
      setLoading(false)
      return
    }

    // Get active job counts per member
    const { data: projects } = await supabase
      .from('projects')
      .select('agent_id, installer_id')
      .eq('org_id', profile.org_id)
      .not('status', 'in', '("closed","cancelled")')

    const jobCounts: Record<string, number> = {}
    if (projects) {
      projects.forEach(p => {
        if (p.agent_id) jobCounts[p.agent_id] = (jobCounts[p.agent_id] || 0) + 1
        if (p.installer_id) jobCounts[p.installer_id] = (jobCounts[p.installer_id] || 0) + 1
      })
    }

    const enriched: TeamMember[] = profiles.map(p => ({
      ...p,
      job_count: jobCounts[p.id] || 0,
    }))

    setMembers(enriched)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      m.role.toLowerCase().includes(q)
    )
  }, [members, search])

  const activeMemberCount = members.filter(m => m.active).length

  function openAddModal() {
    setEditingMember(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  function openEditModal(member: TeamMember) {
    setEditingMember(member)
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
    })
    setError(null)
    setShowModal(true)
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    // Check duplicate email (exclude editing member)
    const duplicate = members.find(
      m => m.email.toLowerCase() === form.email.trim().toLowerCase() &&
           m.id !== editingMember?.id
    )
    if (duplicate) {
      setError('A team member with this email already exists.')
      return
    }

    setSaving(true)

    const permissions: Record<string, boolean> = {}
    ROLE_PERMISSIONS[form.role].forEach(p => { permissions[p] = true })

    if (editingMember) {
      // Update existing member
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          role: form.role,
          permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMember.id)

      if (updateErr) {
        setError(updateErr.message)
        setSaving(false)
        return
      }

      setMembers(prev => prev.map(m =>
        m.id === editingMember.id
          ? {
              ...m,
              name: form.name.trim(),
              email: form.email.trim().toLowerCase(),
              phone: form.phone.trim() || null,
              role: form.role,
              permissions,
            }
          : m
      ))
    } else {
      // Insert new member
      const newId = crypto.randomUUID()
      const now = new Date().toISOString()

      const record = {
        id: newId,
        org_id: profile.org_id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        role: form.role,
        permissions,
        active: true,
        avatar_url: null,
        created_at: now,
        updated_at: now,
      }

      const { error: insertErr } = await supabase.from('profiles').insert(record)
      if (insertErr) {
        setError(insertErr.message)
        setSaving(false)
        return
      }

      setMembers(prev => [...prev, { ...record, job_count: 0 } as TeamMember])
    }

    setSaving(false)
    setShowModal(false)
    setEditingMember(null)
    setForm(EMPTY_FORM)
  }

  async function toggleActive(member: TeamMember) {
    const newActive = !member.active
    const { error: err } = await supabase
      .from('profiles')
      .update({ active: newActive, updated_at: new Date().toISOString() })
      .eq('id', member.id)

    if (!err) {
      setMembers(prev => prev.map(m =>
        m.id === member.id ? { ...m, active: newActive } : m
      ))
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: '#e8eaed',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Users size={26} style={{ color: '#4f7fff' }} />
            Team Members
          </h1>
          <p style={{ fontSize: 13, color: '#5a6080', marginTop: 4 }}>
            {members.length} members  --  {activeMemberCount} active
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: '#4f7fff',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <UserPlus size={16} />
          Add Team Member
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
        <input
          type="text"
          placeholder="Search by name, email, phone, or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 8,
            color: '#e8eaed',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: '#13151c',
        border: '1px solid #1a1d27',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5a6080', fontSize: 14 }}>
            Loading team...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1d27' }}>
                {['Name', 'Role', 'Email', 'Phone', 'Status', 'Active Jobs', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#5a6080',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>
                    {search ? 'No members matching your search.' : 'No team members found.'}
                  </td>
                </tr>
              ) : filtered.map(member => (
                <tr
                  key={member.id}
                  onClick={() => openEditModal(member)}
                  style={{
                    borderBottom: '1px solid rgba(26,29,39,0.8)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Name */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: member.active ? `${getRoleColor(member.role)}20` : '#1a1d27',
                        color: member.active ? getRoleColor(member.role) : '#5a6080',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: '#e8eaed', fontWeight: 700, fontSize: 13 }}>
                        {member.name}
                      </span>
                    </div>
                  </td>
                  {/* Role */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${getRoleColor(member.role)}15`,
                      color: getRoleColor(member.role),
                      textTransform: 'capitalize',
                    }}>
                      {getRoleIcon(member.role, 12)}
                      {member.role}
                    </span>
                  </td>
                  {/* Email */}
                  <td style={{ padding: '12px 14px', color: '#9299b5', fontSize: 13 }}>
                    {member.email}
                  </td>
                  {/* Phone */}
                  <td style={{ padding: '12px 14px', color: '#9299b5', fontSize: 13 }}>
                    {member.phone || '--'}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '12px 14px' }}>
                    {member.active ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'rgba(34,192,122,0.12)',
                        color: '#22c07a',
                      }}>
                        <UserCheck size={12} />
                        Active
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'rgba(242,90,90,0.12)',
                        color: '#f25a5a',
                      }}>
                        <UserX size={12} />
                        Inactive
                      </span>
                    )}
                  </td>
                  {/* Active Jobs */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#e8eaed',
                    }}>
                      {member.job_count || 0}
                    </span>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    {member.id !== profile.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => openEditModal(member)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#9299b5',
                            background: 'transparent',
                            border: '1px solid #1a1d27',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => toggleActive(member)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: member.active ? '#f25a5a' : '#22c07a',
                            background: 'transparent',
                            border: `1px solid ${member.active ? 'rgba(242,90,90,0.3)' : 'rgba(34,192,122,0.3)'}`,
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          {member.active ? <><ShieldOff size={12} /> Deactivate</> : <><ShieldCheck size={12} /> Reactivate</>}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => { setShowModal(false); setEditingMember(null); setForm(EMPTY_FORM) }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 16,
              padding: 24,
              margin: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 20,
                fontWeight: 900,
                color: '#e8eaed',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {editingMember ? <><Edit2 size={18} style={{ color: '#4f7fff' }} /> Edit Team Member</> : <><UserPlus size={18} style={{ color: '#4f7fff' }} /> Add Team Member</>}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingMember(null); setForm(EMPTY_FORM) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Name */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Name *
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 13,
                outline: 'none',
                marginBottom: 12,
              }}
            />

            {/* Email */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Email *
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 13,
                outline: 'none',
                marginBottom: 12,
              }}
            />

            {/* Phone */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Phone
            </label>
            <input
              type="tel"
              placeholder="(optional)"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 13,
                outline: 'none',
                marginBottom: 12,
              }}
            />

            {/* Role */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Role
            </label>
            <select
              value={form.role}
              onChange={e => setForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 13,
                outline: 'none',
                marginBottom: 16,
              }}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.role} value={r.role}>{r.label}</option>
              ))}
            </select>

            {/* Error */}
            {error && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(242,90,90,0.15)',
                color: '#f25a5a',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => { setShowModal(false); setEditingMember(null); setForm(EMPTY_FORM) }}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#9299b5',
                  background: 'transparent',
                  border: '1px solid #1a1d27',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#4f7fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
