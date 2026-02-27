'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TemplatesClient() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplCategory, setTplCategory] = useState('custom')
  const [tplContent, setTplContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/templates').then(r => r.json()).then(d => {
      setTemplates(d.templates || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function createTemplate() {
    if (!tplName.trim() || !tplContent.trim()) return
    setSaving(true)
    const r = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tplName, category: tplCategory, content: tplContent }),
    })
    const d = await r.json()
    if (d.template) setTemplates(prev => [d.template, ...prev])
    setTplName(''); setTplContent(''); setTplCategory('custom')
    setSaving(false)
  }

  async function deleteTemplate(id: string) {
    await fetch('/api/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid rgba(90,96,128,.2)',
    borderRadius: 12,
    padding: 20,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 7,
    border: '1px solid rgba(90,96,128,.3)',
    background: 'var(--surface)',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/settings" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface)', border: '1px solid rgba(90,96,128,.2)',
          color: 'var(--text2)', textDecoration: 'none',
        }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24, fontWeight: 900,
            color: 'var(--text1)', margin: 0,
          }}>
            Message Templates
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>
            Pre-written messages for customer follow-ups, status updates, and onboarding
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        {/* Create form */}
        <div style={{ background: 'var(--surface2)', border: '1px solid rgba(90,96,128,.2)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={14} style={{ color: 'var(--purple)' }} />
            New Template
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Template Name</label>
              <input
                value={tplName}
                onChange={e => setTplName(e.target.value)}
                placeholder="e.g. Job Ready for Pickup"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Category</label>
              <select
                value={tplCategory}
                onChange={e => setTplCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="custom">Custom</option>
                <option value="onboarding">Onboarding</option>
                <option value="follow_up">Follow Up</option>
                <option value="status_update">Status Update</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Message Content</label>
            <textarea
              value={tplContent}
              onChange={e => setTplContent(e.target.value)}
              placeholder="Hi {customer_name}, your wrap is ready! Come pick up your {vehicle_type} at..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Variables: {'{customer_name}'}, {'{vehicle_type}'}, {'{job_title}'}, {'{install_date}'}</div>
          </div>
          <button
            onClick={createTemplate}
            disabled={saving || !tplName.trim() || !tplContent.trim()}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : '+ Save Template'}
          </button>
        </div>

        {/* Templates list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>Loading templates...</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>No templates yet. Create your first one above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {templates.map(t => (
              <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid rgba(90,96,128,.2)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{t.name}</span>
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: t.category === 'onboarding' ? 'rgba(34,192,122,0.15)' : t.category === 'follow_up' ? 'rgba(245,158,11,0.15)' : t.category === 'status_update' ? 'rgba(79,127,255,0.15)' : 'rgba(90,96,128,0.2)',
                      color: t.category === 'onboarding' ? 'var(--green)' : t.category === 'follow_up' ? 'var(--amber)' : t.category === 'status_update' ? 'var(--accent)' : 'var(--text2)',
                    }}>
                      {t.category.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
