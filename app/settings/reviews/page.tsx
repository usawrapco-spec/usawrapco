'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Save, Clock, MessageSquare, Mail, Loader2, CheckCircle } from 'lucide-react'

export default function ReviewSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    enabled: true,
    delay_hours: 48,
    send_method: 'sms',
    google_review_link: '',
    sms_template: 'Hi {first_name}! Your vehicle wrap from USA Wrap Co is complete. We\'d love your feedback! Leave us a Google review: {review_link}',
    email_template: 'Hi {first_name},\n\nThank you for choosing USA Wrap Co! We hope you love your new wrap.\n\nWe\'d really appreciate it if you could take a moment to leave us a Google review:\n{review_link}\n\nThank you!\nThe USA Wrap Co Team',
  })
  const [pendingReviews, setPendingReviews] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) return

      // Load settings
      const { data: reviewSettings } = await supabase
        .from('review_settings')
        .select('*')
        .eq('org_id', profile.org_id)
        .single()

      if (reviewSettings) {
        setSettings({
          enabled: reviewSettings.enabled,
          delay_hours: reviewSettings.delay_hours,
          send_method: reviewSettings.send_method,
          google_review_link: reviewSettings.google_review_link || '',
          sms_template: reviewSettings.sms_template || settings.sms_template,
          email_template: reviewSettings.email_template || settings.email_template,
        })
      }

      // Load pending reviews
      const { data: pending } = await supabase
        .from('review_requests')
        .select('*')
        .eq('org_id', profile.org_id)
        .in('status', ['queued', 'sent'])
        .order('created_at', { ascending: false })
        .limit(20)

      setPendingReviews(pending || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile) return

    await supabase.from('review_settings').upsert({
      org_id: profile.org_id,
      enabled: settings.enabled,
      delay_hours: settings.delay_hours,
      send_method: settings.send_method,
      google_review_link: settings.google_review_link,
      sms_template: settings.sms_template,
      email_template: settings.email_template,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Star size={24} color="var(--amber)" />
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24, fontWeight: 900, color: 'var(--text1)',
            textTransform: 'uppercase',
          }}>
            Review Requests
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Automatically request Google reviews after jobs are paid
          </p>
        </div>
      </div>

      {/* Enable/Disable */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Auto Review Requests</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Automatically send review requests when jobs are marked as Paid
            </div>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: settings.enabled ? 'var(--green)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: settings.enabled ? 25 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Settings */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: 20, marginBottom: 16,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Delay */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Clock size={13} /> Delay After Payment (hours)
          </label>
          <input
            type="number"
            value={settings.delay_hours}
            onChange={e => setSettings(s => ({ ...s, delay_hours: parseInt(e.target.value) || 48 }))}
            style={{
              width: 120, padding: '8px 12px', background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              color: 'var(--text1)', fontSize: 14,
            }}
          />
        </div>

        {/* Send Method */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <MessageSquare size={13} /> Send Method
          </label>
          <select
            value={settings.send_method}
            onChange={e => setSettings(s => ({ ...s, send_method: e.target.value }))}
            style={{
              width: 200, padding: '8px 12px', background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              color: 'var(--text1)', fontSize: 14,
            }}
          >
            <option value="sms">SMS Only</option>
            <option value="email">Email Only</option>
            <option value="both">SMS + Email</option>
          </select>
        </div>

        {/* Google Review Link */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Star size={13} /> Google Review Link
          </label>
          <input
            type="url"
            value={settings.google_review_link}
            onChange={e => setSettings(s => ({ ...s, google_review_link: e.target.value }))}
            placeholder="https://g.page/r/..."
            style={{
              width: '100%', padding: '8px 12px', background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              color: 'var(--text1)', fontSize: 14,
            }}
          />
        </div>

        {/* SMS Template */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <MessageSquare size={13} /> SMS Template
          </label>
          <textarea
            value={settings.sms_template}
            onChange={e => setSettings(s => ({ ...s, sms_template: e.target.value }))}
            rows={3}
            style={{
              width: '100%', padding: '8px 12px', background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              color: 'var(--text1)', fontSize: 13, resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Variables: {'{first_name}'}, {'{review_link}'}
          </div>
        </div>

        {/* Email Template */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Mail size={13} /> Email Template
          </label>
          <textarea
            value={settings.email_template}
            onChange={e => setSettings(s => ({ ...s, email_template: e.target.value }))}
            rows={6}
            style={{
              width: '100%', padding: '8px 12px', background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              color: 'var(--text1)', fontSize: 13, resize: 'vertical',
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff',
            fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
            alignSelf: 'flex-start',
          }}
        >
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Pending Review Requests */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>
          Pending Review Requests ({pendingReviews.length})
        </h3>
        {pendingReviews.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
            No pending review requests
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingReviews.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                    {r.customer_name || 'Unknown Customer'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {r.customer_phone || r.customer_email || 'No contact info'} | {r.method}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 6,
                    background: r.status === 'sent' ? 'rgba(34,192,122,0.1)' : 'rgba(245,158,11,0.1)',
                    color: r.status === 'sent' ? 'var(--green)' : 'var(--amber)',
                  }}>
                    {r.status}
                  </span>
                  {r.scheduled_for && (
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                      Scheduled: {new Date(r.scheduled_for).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
