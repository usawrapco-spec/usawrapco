'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ArrowLeft, Building2, Upload, Save } from 'lucide-react'
import Link from 'next/link'

interface OrgSettingsClientProps {
  profile: Profile
  org: any
}

export default function OrgSettingsClient({ profile, org }: OrgSettingsClientProps) {
  const [name, setName] = useState(org.name || 'USA Wrap Co')
  const [address, setAddress] = useState(org.settings?.address || '4124 124th St NW, Gig Harbor, WA 98332')
  const [phone, setPhone] = useState(org.settings?.phone || '(253) 555-0100')
  const [website, setWebsite] = useState(org.settings?.website || 'https://usawrapco.com')
  const [taxRate, setTaxRate] = useState(org.settings?.tax_rate || 8.25)
  const [timezone, setTimezone] = useState(org.settings?.timezone || 'America/Los_Angeles')
  const [logoUrl, setLogoUrl] = useState(org.logo_url || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          name,
          logo_url: logoUrl,
          settings: {
            address,
            phone,
            website,
            tax_rate: taxRate,
            timezone,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.org_id)

      if (error) throw error
      setMessage('✓ Saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setMessage('✗ Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-text3 hover:text-accent">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-900 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Organization Settings
          </h1>
          <p className="text-sm text-text3">Business info, logo, tax rate, timezone</p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Business Name</label>
          <input
            type="text"
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Address</label>
          <input
            type="text"
            className="field w-full"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Phone</label>
            <input
              type="tel"
              className="field w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Website</label>
            <input
              type="url"
              className="field w-full"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              className="field w-full"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Timezone</label>
            <select className="field w-full" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/New_York">Eastern Time</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">Logo URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              className="field flex-1"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <button className="btn-secondary text-xs" style={{ padding: '8px 12px' }}>
              <Upload size={14} />
            </button>
          </div>
          {logoUrl && (
            <div className="mt-2 p-3 border border-border rounded-lg bg-surface2">
              <img src={logoUrl} alt="Logo preview" className="h-12" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {message && (
            <span className={`text-xs font-600 ${message.startsWith('✓') ? 'text-green' : 'text-red'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
