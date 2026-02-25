'use client'

import { useState, useEffect } from 'react'
import { X, Copy, CheckCircle, Send, RefreshCw, Search, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  onClose: () => void
}

export default function DesignIntakeLinkModal({ profile, onClose }: Props) {
  const supabase = createClient()
  const [projectSearch, setProjectSearch] = useState('')
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [token, setToken] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  // Load projects
  useEffect(() => {
    supabase.from('projects')
      .select('id, title')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setProjects(data || []))
  }, [profile.org_id])

  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(projectSearch.toLowerCase())
  )

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/design-intake/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject || undefined,
          customer_name: customerName || undefined,
          customer_email: customerEmail || undefined,
        }),
      })
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
        setUrl(data.url)
      }
    } catch {}
    setGenerating(false)
  }

  async function copyLink() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #1a1d27)', border: '1px solid var(--card-border, #2a2d37)',
          borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh',
          overflow: 'auto', animation: 'fadeUp .2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--card-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palette size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
              Send Design Intake Link
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!token ? (
            <>
              {/* Optional project link */}
              <div>
                <label style={labelStyle}>Link to Project (optional)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text3)', pointerEvents: 'none',
                  }} />
                  <input
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                {projectSearch && filteredProjects.length > 0 && !selectedProject && (
                  <div style={{
                    maxHeight: 150, overflowY: 'auto', marginTop: 4,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}>
                    {filteredProjects.slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(p.id); setProjectSearch(p.title) }}
                        style={{
                          display: 'block', width: '100%', padding: '8px 12px',
                          background: 'none', border: 'none', textAlign: 'left',
                          color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                )}
                {selectedProject && (
                  <button
                    onClick={() => { setSelectedProject(''); setProjectSearch('') }}
                    style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Pre-fill fields */}
              <div>
                <label style={labelStyle}>Customer Name (optional pre-fill)</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Smith" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Customer Email (optional pre-fill)</label>
                <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@example.com" style={inputStyle} />
              </div>

              <button onClick={generate} disabled={generating} style={{
                width: '100%', padding: '12px 20px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: generating ? 0.6 : 1,
              }}>
                {generating ? (
                  <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                ) : (
                  <>Generate Link</>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated link */}
              <div style={{
                padding: '14px 16px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 10,
              }}>
                <div style={{
                  fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--accent)', wordBreak: 'break-all',
                }}>
                  {url}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={copyLink} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  background: copied ? 'rgba(34,192,122,0.15)' : 'var(--surface2)',
                  color: copied ? '#22c07a' : 'var(--text1)',
                  fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                </button>
                <a
                  href={`mailto:${customerEmail}?subject=${encodeURIComponent('Your Design Intake Form - USA Wrap Co')}&body=${encodeURIComponent(`Hi${customerName ? ' ' + customerName : ''},\n\nPlease use the link below to tell us about your design project:\n\n${url}\n\nWe look forward to working with you!\n\n- USA Wrap Co Design Team`)}`}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
                    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Send size={14} /> Send via Email
                </a>
              </div>

              <button onClick={() => { setToken(''); setUrl('') }} style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
              }}>
                Generate Another Link
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: 'var(--text3)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'var(--surface)', border: '1px solid var(--border)',
  color: 'var(--text1)', fontSize: 14, outline: 'none',
}
