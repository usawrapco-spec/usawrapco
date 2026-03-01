'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole, TeamInvite } from '@/types'
import { ROLE_LABELS, ROLE_COLORS, ROLE_OPTIONS } from '@/lib/permissions'
import {
  Search, Plus, X, Edit2, Users, UserPlus, UserCheck, UserX,
  ShieldCheck, ShieldOff, Mail, RefreshCw, Clock, Send,
  ChevronDown, Check, Link2,
} from 'lucide-react'
import CustomerSearchModal, { type CustomerRow } from '@/components/shared/CustomerSearchModal'

interface Props {
  profile: Profile
}

type MemberRow =
  | ({ _type: 'member' } & Profile & { job_count: number })
  | ({ _type: 'invite' } & TeamInvite)

const S: Record<string, React.CSSProperties> = {
  label: {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  } as const,
  input: {
    width: '100%', padding: '10px 12px', background: '#0d0f14',
    border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
    fontSize: 13, outline: 'none',
  } as const,
  card: {
    background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12,
  } as const,
  th: {
    padding: '10px 14px', textAlign: 'left' as const, fontSize: 11,
    fontWeight: 700, color: '#5a6080', textTransform: 'uppercase' as const,
    letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif',
  } as const,
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? '#5a6080'
  const label = ROLE_LABELS[role] ?? role
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: `${color}18`, color,
    }}>
      {label}
    </span>
  )
}

function StatusBadge({ active, type }: { active?: boolean; type?: string }) {
  if (type === 'invite') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
        background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
      }}>
        <Clock size={11} /> Invited
      </span>
    )
  }
  return active ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: 'rgba(34,192,122,0.12)', color: '#22c07a',
    }}>
      <UserCheck size={11} /> Active
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: 'rgba(242,90,90,0.12)', color: '#f25a5a',
    }}>
      <UserX size={11} /> Disabled
    </span>
  )
}

export default function EmployeesPage({ profile }: Props) {
  const supabase = createClient()

  // ── State ───────────────────────────────────────────────────
  const [members, setMembers] = useState<Profile[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('sales_agent')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit modal
  const [editMember, setEditMember] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('viewer')
  const [editLinkedCustomer, setEditLinkedCustomer] = useState<{ id: string; name: string } | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadMembers(), loadInvites()])
    setLoading(false)
  }

  async function loadMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('name')
    if (!data) return
    setMembers(data as Profile[])

    const { data: projects } = await supabase
      .from('projects')
      .select('agent_id, installer_id')
      .eq('org_id', profile.org_id)
      .not('status', 'in', '("closed","cancelled")')

    const counts: Record<string, number> = {}
    if (projects) {
      projects.forEach(p => {
        if (p.agent_id)     counts[p.agent_id]     = (counts[p.agent_id] || 0) + 1
        if (p.installer_id) counts[p.installer_id] = (counts[p.installer_id] || 0) + 1
      })
    }
    setJobCounts(counts)
  }

  async function loadInvites() {
    const { data } = await supabase
      .from('team_invites')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (data) setInvites(data as TeamInvite[])
  }

  // ── Invite handler ───────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    if (!inviteEmail.trim()) return

    // Check if email already a member
    const exists = members.find(m => m.email.toLowerCase() === inviteEmail.trim().toLowerCase())
    if (exists) {
      setInviteMsg({ type: 'error', text: 'This email already has an account.' })
      return
    }

    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setInviteMsg({ type: 'error', text: json.error || 'Failed to send invite.' })
      } else {
        setInviteMsg({ type: 'success', text: `Invite sent to ${inviteEmail.trim()}` })
        setInviteEmail('')
        await loadInvites()
      }
    } catch {
      setInviteMsg({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setInviting(false)
    }
  }

  async function handleResend(invite: TeamInvite) {
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invite.email, role: invite.role, resend: true }),
    })
    if (res.ok) {
      setInviteMsg({ type: 'success', text: `Invite resent to ${invite.email}` })
    }
  }

  async function handleCancelInvite(invite: TeamInvite) {
    await fetch('/api/team/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: invite.id }),
    })
    setInvites(prev => prev.filter(i => i.id !== invite.id))
  }

  // ── Edit member ──────────────────────────────────────────────
  function openEdit(member: Profile) {
    setEditMember(member)
    setEditRole(member.role)
    setEditError(null)
    const cid = (member as any).customer_id
    const cname = (member as any).customer_name
    setEditLinkedCustomer(cid ? { id: cid, name: cname || '' } : null)
  }

  function handleSelectCustomer(c: CustomerRow) {
    setEditLinkedCustomer({ id: c.id, name: c.name })
    setCustomerModalOpen(false)
  }

  async function handleSaveRole() {
    if (!editMember) return
    setSaving(true)
    setEditError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ role: editRole, customer_id: editLinkedCustomer?.id ?? null, updated_at: new Date().toISOString() })
      .eq('id', editMember.id)
    if (error) {
      setEditError(error.message)
    } else {
      setMembers(prev => prev.map(m => m.id === editMember.id
        ? { ...m, role: editRole, customer_id: editLinkedCustomer?.id ?? null } as any
        : m))
      setEditMember(null)
    }
    setSaving(false)
  }

  async function toggleActive(member: Profile) {
    const next = !member.active
    const { error } = await supabase
      .from('profiles')
      .update({ active: next, updated_at: new Date().toISOString() })
      .eq('id', member.id)
    if (!error) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, active: next } : m))
    }
  }

  // ── Filtered rows ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    )
  }, [members, search])

  const activeCount  = members.filter(m => m.active).length
  const pendingCount = invites.length

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900,
            color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Users size={26} style={{ color: '#4f7fff' }} />
            Team
          </h1>
          <p style={{ fontSize: 13, color: '#5a6080', marginTop: 4 }}>
            {members.length} members &middot; {activeCount} active
            {pendingCount > 0 && <> &middot; <span style={{ color: '#f59e0b' }}>{pendingCount} invited</span></>}
          </p>
        </div>
      </div>

      {/* ── Invite Form ── */}
      <div style={{ ...S.card, padding: 20, marginBottom: 24 }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800,
          color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        }}>
          <UserPlus size={18} style={{ color: '#4f7fff' }} />
          Invite Team Member
        </div>

        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={S.label}>Email address *</label>
            <input
              type="email"
              placeholder="colleague@usawrapco.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              style={S.input}
            />
          </div>

          <div style={{ flex: '0 0 180px' }}>
            <label style={S.label}>Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={S.input}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', background: '#4f7fff', color: '#fff',
              fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none',
              cursor: 'pointer', opacity: inviting ? 0.6 : 1, flexShrink: 0,
            }}
          >
            <Send size={14} />
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </form>

        {inviteMsg && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: inviteMsg.type === 'success' ? 'rgba(34,192,122,0.12)' : 'rgba(242,90,90,0.12)',
            color: inviteMsg.type === 'success' ? '#22c07a' : '#f25a5a',
          }}>
            {inviteMsg.text}
          </div>
        )}
      </div>

      {/* ── Pending Invites ── */}
      {invites.length > 0 && (
        <div style={{ ...S.card, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #1a1d27',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800,
            color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Clock size={14} />
            Pending Invites ({invites.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1d27' }}>
                {['Email', 'Role', 'Invited', 'Actions'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid rgba(26,29,39,0.6)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Mail size={14} />
                      </div>
                      <span style={{ color: '#e8eaed', fontSize: 13 }}>{inv.email}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <RoleBadge role={inv.role} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#5a6080', fontSize: 12 }}>
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleResend(inv)}
                        title="Resend invite"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          color: '#4f7fff', background: 'transparent',
                          border: '1px solid rgba(79,127,255,0.3)', borderRadius: 6, cursor: 'pointer',
                        }}
                      >
                        <RefreshCw size={11} /> Resend
                      </button>
                      <button
                        onClick={() => handleCancelInvite(inv)}
                        title="Cancel invite"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          color: '#f25a5a', background: 'transparent',
                          border: '1px solid rgba(242,90,90,0.3)', borderRadius: 6, cursor: 'pointer',
                        }}
                      >
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Team Roster ── */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800,
          color: '#e8eaed',
        }}>
          Team Roster
        </div>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
          <input
            type="text"
            placeholder="Search name, email, role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...S.input, paddingLeft: 32, width: 300 }}
          />
        </div>
      </div>

      <div style={{ ...S.card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5a6080', fontSize: 14 }}>
            Loading team…
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1d27' }}>
                {['Name', 'Role', 'Email', 'Status', 'Active Jobs', 'Last Seen', 'Actions'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>
                    {search ? 'No members match your search.' : 'No team members yet.'}
                  </td>
                </tr>
              ) : filtered.map(member => {
                const color = ROLE_COLORS[member.role] ?? '#5a6080'
                return (
                  <tr
                    key={member.id}
                    style={{ borderBottom: '1px solid rgba(26,29,39,0.6)', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.03)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Name */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: member.active ? `${color}18` : '#1a1d27',
                          color: member.active ? color : '#5a6080',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 800, flexShrink: 0,
                        }}>
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span style={{ color: '#e8eaed', fontWeight: 700, fontSize: 13 }}>
                          {member.name}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '12px 14px' }}>
                      <RoleBadge role={member.role} />
                    </td>

                    {/* Email */}
                    <td style={{ padding: '12px 14px', color: '#9299b5', fontSize: 13 }}>
                      {member.email}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge active={member.active} />
                    </td>

                    {/* Active Jobs */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 14, fontWeight: 700, color: '#e8eaed',
                      }}>
                        {jobCounts[member.id] || 0}
                      </span>
                    </td>

                    {/* Last Seen */}
                    <td style={{ padding: '12px 14px', color: '#5a6080', fontSize: 12 }}>
                      {member.last_active_date
                        ? new Date(member.last_active_date).toLocaleDateString()
                        : member.updated_at
                          ? new Date(member.updated_at).toLocaleDateString()
                          : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      {member.id !== profile.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => openEdit(member)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', fontSize: 11, fontWeight: 600,
                              color: '#9299b5', background: 'transparent',
                              border: '1px solid #1a1d27', borderRadius: 6, cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={11} /> Edit Role
                          </button>
                          <button
                            onClick={() => toggleActive(member)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', fontSize: 11, fontWeight: 600,
                              color: member.active ? '#f25a5a' : '#22c07a',
                              background: 'transparent',
                              border: `1px solid ${member.active ? 'rgba(242,90,90,0.3)' : 'rgba(34,192,122,0.3)'}`,
                              borderRadius: 6, cursor: 'pointer',
                            }}
                          >
                            {member.active
                              ? <><ShieldOff size={11} /> Disable</>
                              : <><ShieldCheck size={11} /> Enable</>}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#5a6080' }}>You</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Search Modal */}
      <CustomerSearchModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        orgId={profile.org_id || ''}
        onSelect={handleSelectCustomer}
      />

      {/* ── Edit Role Modal ── */}
      {editMember && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setEditMember(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: 400, background: '#13151c',
              border: '1px solid #1a1d27', borderRadius: 16, padding: 24, margin: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
            }}>
              <h2 style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 900,
                color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Edit2 size={16} style={{ color: '#4f7fff' }} />
                Edit Role — {editMember.name}
              </h2>
              <button onClick={() => setEditMember(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={18} />
              </button>
            </div>

            <label style={S.label}>Role</label>
            <select
              value={editRole}
              onChange={e => setEditRole(e.target.value as UserRole)}
              style={{ ...S.input, marginBottom: 8 }}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <p style={{ fontSize: 11, color: '#5a6080', marginBottom: 16, lineHeight: 1.5 }}>
              Changing this role will update what {editMember.name} can access immediately.
            </p>

            {/* Linked Customer Account */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                Linked Customer Account
              </label>
              {editLinkedCustomer ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(79,127,255,0.15)', color: '#4f7fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>
                      {editLinkedCustomer.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>
                      {editLinkedCustomer.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCustomerModalOpen(true)}
                      style={{ fontSize: 11, color: '#4f7fff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setEditLinkedCustomer(null)}
                      style={{ fontSize: 11, color: '#f25a5a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCustomerModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', borderRadius: 8,
                    border: '1px dashed #1a1d27', background: '#0d0f14',
                    color: '#5a6080', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Link2 size={13} style={{ color: '#4f7fff', flexShrink: 0 }} />
                  <span>Link to existing customer record</span>
                </button>
              )}
            </div>

            {editError && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, background: 'rgba(242,90,90,0.12)',
                color: '#f25a5a', fontSize: 12, fontWeight: 600, marginBottom: 12,
              }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setEditMember(null)}
                disabled={saving}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#9299b5',
                  background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 20px', fontSize: 13, fontWeight: 700,
                  color: '#fff', background: '#4f7fff', border: 'none',
                  borderRadius: 8, cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}
              >
                <Check size={14} />
                {saving ? 'Saving…' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
