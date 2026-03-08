'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ListChecks, Plus, Eye, Copy, Check,
  ExternalLink, BarChart3, Users, TrendingUp,
  FileText, ChevronRight, Globe, Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FormDef {
  id: string
  title: string
  description: string
  publicUrl: string
  source: string
  icon: React.ElementType
  iconColor: string
  tags: string[]
}

// Defined forms — add new ones here as they're built
const FORMS: FormDef[] = [
  {
    id: 'quote-request',
    title: 'Quote & Lead Capture',
    description: 'Full-featured quote request form with vehicle type selector, coverage options, file upload, and optional AI Design Studio link. Embed on any page of your website.',
    publicUrl: '/get-a-quote',
    source: 'website_form',
    icon: FileText,
    iconColor: '#4f7fff',
    tags: ['Lead Capture', 'Quote', 'Vehicle Wrap'],
  },
]

interface FormStats {
  total: number
  thisWeek: number
  thisMonth: number
}

export default function FormsBuilderPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Record<string, FormStats>>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const supabase = createClient()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data } = await supabase
      .from('prospects')
      .select('id, created_at, source')
      .in('source', FORMS.map(f => f.source))

    if (!data) return

    const result: Record<string, FormStats> = {}
    for (const form of FORMS) {
      const rows = data.filter(r => r.source === form.source)
      result[form.id] = {
        total:     rows.length,
        thisWeek:  rows.filter(r => r.created_at >= weekAgo).length,
        thisMonth: rows.filter(r => r.created_at >= monthAgo).length,
      }
    }
    setStats(result)
  }

  function copyEmbed(form: FormDef) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const code = `<iframe\n  src="${origin}${form.publicUrl}"\n  width="100%"\n  height="900"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n  title="${form.title}"\n></iframe>`
    navigator.clipboard.writeText(code)
    setCopied(form.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const totalLeads = Object.values(stats).reduce((sum, s) => sum + s.total, 0)
  const weekLeads  = Object.values(stats).reduce((sum, s) => sum + s.thisWeek, 0)

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ListChecks size={20} color="#4f7fff" />
            <h1 style={{ color: 'var(--text1)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Forms Builder
            </h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0 }}>
            Website forms, lead capture pages, and embeddable tools for your site.
          </p>
        </div>
        <button
          disabled
          title="Coming soon"
          style={{
            background: 'var(--surface2)', border: '1px dashed #2a2d3e',
            borderRadius: 8, padding: '0.6rem 1.25rem',
            color: 'var(--text3)', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <Plus size={15} />
          New Form
          <span style={{ fontSize: '0.7rem', background: 'var(--surface)', borderRadius: 4, padding: '1px 6px' }}>
            Soon
          </span>
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem', marginBottom: '2rem',
      }}>
        {[
          { label: 'Total Forms',      value: FORMS.length,    icon: ListChecks, color: '#4f7fff' },
          { label: 'Total Leads',       value: totalLeads,      icon: Users,      color: '#22c07a' },
          { label: 'Leads This Week',   value: weekLeads,       icon: TrendingUp, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 10, padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: s.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <s.icon size={17} color={s.color} />
            </div>
            <div>
              <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: '1.3rem', fontFamily: '"JetBrains Mono", monospace' }}>
                {s.value}
              </div>
              <div style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Forms list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {FORMS.map(form => {
          const FormIcon = form.icon
          const s = stats[form.id]
          const isCopied = copied === form.id

          return (
            <div key={form.id} style={{
              background: 'var(--surface)', border: '1px solid var(--surface2)',
              borderRadius: 12, padding: '1.5rem',
              display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}>
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                background: form.iconColor + '18', border: `1px solid ${form.iconColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FormIcon size={22} color={form.iconColor} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <h2 style={{ color: 'var(--text1)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    {form.title}
                  </h2>
                  <span style={{
                    background: '#22c07a18', border: '1px solid #22c07a40',
                    color: '#22c07a', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 600,
                  }}>
                    Live
                  </span>
                </div>
                <p style={{ color: 'var(--text2)', fontSize: '0.85rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  {form.description}
                </p>
                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {form.tags.map(t => (
                    <span key={t} style={{
                      background: 'var(--surface2)', border: '1px solid #2a2d3e',
                      color: 'var(--text3)', borderRadius: 4, padding: '1px 7px', fontSize: '0.72rem',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Embed code box */}
                <div style={{
                  background: '#0d0f14', border: '1px solid #1a1d27',
                  borderRadius: 8, padding: '0.75rem 1rem',
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'var(--text3)',
                  marginBottom: '1rem', position: 'relative', lineHeight: 1.6,
                }}>
                  <Globe size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} color="#5a6080" />
                  <span>Public URL: </span>
                  <span style={{ color: '#4f7fff' }}>{typeof window !== 'undefined' ? window.location.origin : ''}{form.publicUrl}</span>
                  <br />
                  <span style={{ color: '#5a6080' }}>{'<iframe src="...">'}</span>
                  <span style={{ color: 'var(--text3)' }}> — embed on any website</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => router.push(form.publicUrl)}
                    style={{
                      background: 'var(--surface2)', border: '1px solid #2a2d3e',
                      borderRadius: 7, padding: '0.5rem 0.9rem', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: '0.82rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                    }}
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    onClick={() => copyEmbed(form)}
                    style={{
                      background: isCopied ? 'rgba(34,192,122,0.12)' : 'var(--surface2)',
                      border: `1px solid ${isCopied ? '#22c07a' : '#2a2d3e'}`,
                      borderRadius: 7, padding: '0.5rem 0.9rem', cursor: 'pointer',
                      color: isCopied ? '#22c07a' : 'var(--text2)', fontSize: '0.82rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s',
                    }}
                  >
                    {isCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Embed Code</>}
                  </button>
                  <button
                    onClick={() => router.push('/prospects?source=website_form')}
                    style={{
                      background: 'var(--surface2)', border: '1px solid #2a2d3e',
                      borderRadius: 7, padding: '0.5rem 0.9rem', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: '0.82rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                    }}
                  >
                    <BarChart3 size={14} /> View Leads
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                minWidth: 110, flexShrink: 0,
              }}>
                {[
                  { label: 'Total leads',   value: s?.total     ?? '—' },
                  { label: 'This month',    value: s?.thisMonth ?? '—' },
                  { label: 'This week',     value: s?.thisWeek  ?? '—' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'var(--surface2)', borderRadius: 7,
                    padding: '0.5rem 0.75rem', textAlign: 'center',
                  }}>
                    <div style={{ color: 'var(--text1)', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem' }}>
                      {stat.value}
                    </div>
                    <div style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Coming soon cards */}
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: 'var(--text3)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Coming Soon
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Customer Survey',    desc: 'Post-install satisfaction survey',     icon: BarChart3,  color: '#8b5cf6' },
            { label: 'Fleet Quote Form',   desc: 'Multi-vehicle fleet intake form',      icon: FileText,   color: '#22d3ee' },
            { label: 'Installer Apply',    desc: 'Installer contractor application',     icon: Users,      color: '#f59e0b' },
            { label: 'Referral Landing',   desc: 'Branded referral capture page',        icon: Sparkles,   color: '#22c07a' },
          ].map(c => (
            <div key={c.label} style={{
              background: 'var(--surface)', border: '1px dashed #1a1d27',
              borderRadius: 10, padding: '1rem', opacity: 0.6,
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            }}>
              <c.icon size={18} color={c.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '0.85rem', fontWeight: 600 }}>{c.label}</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
