'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface PermissionsEditorClientProps {
  profile: Profile
  org: any
}

const FEATURES = [
  'Dashboard', 'Jobs', 'Estimates', 'Design Studio', 'Install Portal',
  'Contacts', 'Inbox', 'Tasks', 'Analytics', 'Reports', 'Admin', 'Sourcing',
  'Revenue Engine', 'WrapUp', 'Networking Map', 'Payroll', 'Leaderboard'
]

const ROLES = ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer']

export default function PermissionsEditorClient({ profile, org }: PermissionsEditorClientProps) {
  const [permissions, setPermissions] = useState(org.settings?.permissions || {})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const togglePermission = (role: string, feature: string) => {
    const key = `${role}_${feature}`
    setPermissions((prev: any) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          settings: { ...org.settings, permissions },
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.org_id)

      if (error) throw error
      setMessage('✓ Permissions saved')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setMessage('✗ Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-text3 hover:text-accent">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-900 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Permissions Editor
          </h1>
          <p className="text-sm text-text3">Visual permission matrix for all roles</p>
        </div>
        {message && (
          <span className={`text-xs font-600 ${message.startsWith('✓') ? 'text-green' : 'text-red'}`}>
            {message}
          </span>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="card p-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 text-xs font-700 text-text2 uppercase border-b border-border">Feature</th>
              {ROLES.map(role => (
                <th key={role} className="text-center p-3 text-xs font-700 text-text2 uppercase border-b border-border">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(feature => (
              <tr key={feature} className="border-b border-border/30 hover:bg-surface2/30">
                <td className="p-3 text-sm font-600 text-text1">{feature}</td>
                {ROLES.map(role => {
                  const key = `${role}_${feature}`
                  const checked = permissions[key] !== false
                  return (
                    <td key={role} className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(role, feature)}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
