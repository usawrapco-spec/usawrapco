'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { clsx } from 'clsx'

interface SettingsClientProps {
  profile: Profile
  org: any
}

export function SettingsClient({ profile, org }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'org' | 'profile' | 'billing' | 'integrations'>('org')
  const [orgName, setOrgName] = useState(org?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  // Profile settings
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone || '')

  async function saveOrg() {
    setSaving(true)
    await supabase.from('orgs').update({ name: orgName }).eq('id', profile.org_id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({ name, phone: phone || null }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { key: 'org' as const, label: 'Organization', icon: '🏢' },
    { key: 'profile' as const, label: 'My Profile', icon: '👤' },
    { key: 'billing' as const, label: 'Billing', icon: '💳' },
    { key: 'integrations' as const, label: 'Integrations', icon: '🔌' },
  ]

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ⚙️ Settings
          </h1>
          <p className="text-sm text-text3 mt-1">
            Manage your organization and preferences
          </p>
        </div>
        {saved && (
          <span className="text-sm text-green font-600 anim-fade-up">✓ Saved</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-600 border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text3 hover:text-text1'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Organization */}
      {activeTab === 'org' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <div className="section-label mb-4">Organization Details</div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="field-label">Company Name</label>
                <input className="field" value={orgName} onChange={e => setOrgName(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Org ID</label>
                <input className="field" value={profile.org_id} disabled />
              </div>
              <div>
                <label className="field-label">Plan</label>
                <input className="field" value={org?.plan || 'starter'} disabled />
              </div>
              <button className="btn-primary" onClick={saveOrg} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Organization'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="section-label mb-4">Business Settings</div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="field-label">Default Commission Rate (%)</label>
                <input type="number" className="field" defaultValue="10" />
              </div>
              <div>
                <label className="field-label">Default Installer Rate ($/hr)</label>
                <input type="number" className="field" defaultValue="35" />
              </div>
              <div>
                <label className="field-label">Target GPM (%)</label>
                <input type="number" className="field" defaultValue="70" />
              </div>
              <div className="text-xs text-text3 bg-surface2 rounded-lg p-3">
                💡 These defaults will be applied to new projects. You can override them per project.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <div className="section-label mb-4">Your Profile</div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-900 text-accent">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-800 text-text1">{profile.name}</div>
                  <div className="text-sm text-text3">{profile.email}</div>
                  <div className="text-xs font-700 text-purple capitalize mt-0.5">{profile.role}</div>
                </div>
              </div>
              <div>
                <label className="field-label">Display Name</label>
                <input className="field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="field" type="tel" placeholder="(206) 555-1234" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field" value={profile.email} disabled />
                <div className="text-xs text-text3 mt-1">Email cannot be changed here.</div>
              </div>
              <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Profile'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="section-label mb-4">Security</div>
            <div className="flex flex-col gap-4">
              <div className="text-sm text-text3">
                You signed in with Google OAuth. Password management is handled through your Google account.
              </div>
              <div className="bg-surface2 rounded-lg p-4">
                <div className="text-xs font-700 text-text3 uppercase mb-2">Active Sessions</div>
                <div className="flex items-center gap-3">
                  <span className="live-dot"></span>
                  <span className="text-sm text-text1 font-600">Current session</span>
                  <span className="text-xs text-text3">Active now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {activeTab === 'billing' && (
        <div className="card max-w-lg">
          <div className="section-label mb-4">Plan & Billing</div>
          <div className="bg-accent/5 border border-accent/30 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-900 text-accent">Starter Plan</span>
              <span className="badge badge-green">Active</span>
            </div>
            <div className="text-sm text-text3">
              Currently on the free starter plan. All features are available during beta.
            </div>
          </div>
          <div className="text-xs text-text3">
            Billing features coming soon. Contact support for enterprise pricing.
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-2 gap-5">
          {[
            { name: 'GoHighLevel', icon: '📱', desc: 'Sync contacts, opportunities, and pipeline', status: 'coming_soon' },
            { name: 'Slack', icon: '💬', desc: 'Get notifications for pipeline events', status: 'coming_soon' },
            { name: 'Google Drive', icon: '📁', desc: 'Sync design files and proofs', status: 'coming_soon' },
            { name: 'QuickBooks', icon: '📒', desc: 'Sync invoices and financial data', status: 'coming_soon' },
          ].map(int => (
            <div key={int.name} className="card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <div className="font-700 text-text1">{int.name}</div>
                  <div className="text-xs text-text3">{int.desc}</div>
                </div>
              </div>
              <button className="btn-ghost btn-sm w-full" disabled>
                Coming Soon
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
