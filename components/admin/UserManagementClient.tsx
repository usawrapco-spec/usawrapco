'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ArrowLeft, UserPlus, Edit2, Shield, Ban, Check, X } from 'lucide-react'
import Link from 'next/link'

interface UserManagementClientProps {
  profile: Profile
  initialUsers: any[]
}

export default function UserManagementClient({ profile, initialUsers }: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editIsOwner, setEditIsOwner] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const roles = ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer']

  const handleEditStart = (user: any) => {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditIsOwner(user.is_owner || false)
  }

  const handleEditSave = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          is_owner: editIsOwner,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, role: editRole, is_owner: editIsOwner } : u))
      setEditingId(null)
      setMessage('✓ User updated')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setMessage('✗ Error: ' + err.message)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !currentActive, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, active: !currentActive } : u))
      setMessage(`✓ User ${!currentActive ? 'activated' : 'deactivated'}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setMessage('✗ Error: ' + err.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-text3 hover:text-accent">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-900 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            User Management
          </h1>
          <p className="text-sm text-text3">Manage users, roles, and permissions</p>
        </div>
        {message && (
          <span className={`text-xs font-600 ${message.startsWith('✓') ? 'text-green' : 'text-red'}`}>
            {message}
          </span>
        )}
      </div>

      {/* User Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface2">
              <th className="text-left p-4 text-xs font-700 text-text2 uppercase tracking-wide">Name</th>
              <th className="text-left p-4 text-xs font-700 text-text2 uppercase tracking-wide">Email</th>
              <th className="text-left p-4 text-xs font-700 text-text2 uppercase tracking-wide">Role</th>
              <th className="text-left p-4 text-xs font-700 text-text2 uppercase tracking-wide">Owner</th>
              <th className="text-left p-4 text-xs font-700 text-text2 uppercase tracking-wide">Status</th>
              <th className="text-left p-4 text-xs font-700 text-text2 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-surface2/50">
                <td className="p-4">
                  <div className="font-600 text-text1">{user.name}</div>
                </td>
                <td className="p-4 text-sm text-text3">{user.email}</td>
                <td className="p-4">
                  {editingId === user.id ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="field text-xs py-1"
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="inline-block px-2 py-1 text-xs font-700 rounded-full bg-accent/10 text-accent">
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === user.id ? (
                    <input
                      type="checkbox"
                      checked={editIsOwner}
                      onChange={(e) => setEditIsOwner(e.target.checked)}
                      className="w-4 h-4"
                    />
                  ) : user.is_owner ? (
                    <Shield size={16} className="text-amber" />
                  ) : (
                    <span className="text-text3 text-xs">—</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 text-xs font-700 rounded-full ${
                    user.active ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                  }`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {editingId === user.id ? (
                      <>
                        <button
                          onClick={() => handleEditSave(user.id)}
                          className="p-1.5 hover:bg-green/10 rounded text-green"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 hover:bg-red/10 rounded text-red"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(user)}
                          className="p-1.5 hover:bg-accent/10 rounded text-accent"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.active)}
                          className={`p-1.5 hover:bg-${user.active ? 'red' : 'green'}/10 rounded text-${user.active ? 'red' : 'green'}`}
                          title={user.active ? 'Deactivate' : 'Activate'}
                        >
                          {user.active ? <Ban size={16} /> : <Check size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
