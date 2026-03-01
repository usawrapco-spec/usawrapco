'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ArrowLeft, FileText, Copy, ChevronRight } from 'lucide-react'
import type { Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { ORG_ID } from '@/lib/org'

interface Template {
  id: string
  name: string
  description?: string
  category?: string
  use_count?: number
  created_at: string
  updated_at: string
  line_items?: any[]
}

interface Props {
  profile: Profile
  initialTemplates: Template[]
}

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const categoryLabel = (c: string) =>
  (c || 'custom').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

const CATEGORY_COLORS: Record<string, string> = {
  full_wrap:    'var(--accent)',
  partial_wrap: 'var(--cyan)',
  chrome_delete:'var(--purple)',
  ppf:          'var(--green)',
  tint:         'var(--amber)',
  interior:     'var(--red)',
  commercial:   '#f97316',
  fleet:        '#06b6d4',
  marine:       '#3b82f6',
  custom:       'var(--text3)',
}

export default function EstimateTemplatesClient({ profile, initialTemplates }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const orgId = profile.org_id || ORG_ID

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleNew() {
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('estimate_templates')
        .insert({
          org_id: orgId,
          name: 'New Template',
          category: 'custom',
          line_items: [],
          form_data: {},
          created_by: profile.id,
          use_count: 0,
        })
        .select('id')
        .single()

      if (error) throw error
      router.push(`/estimates/templates/${data.id}`)
    } catch (err) {
      console.error('[templates] create error:', err)
      setCreating(false)
    }
  }

  async function handleDuplicate(t: Template) {
    try {
      const { data, error } = await supabase
        .from('estimate_templates')
        .insert({
          org_id: orgId,
          name: `${t.name} (Copy)`,
          description: t.description,
          category: t.category,
          line_items: t.line_items || [],
          form_data: {},
          created_by: profile.id,
          use_count: 0,
        })
        .select('id')
        .single()

      if (error) throw error
      setTemplates(prev => [...prev, {
        ...t,
        id: data.id,
        name: `${t.name} (Copy)`,
        use_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
    } catch (err) {
      console.error('[templates] duplicate error:', err)
    }
  }

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/estimates" style={{ color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Estimates
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont, letterSpacing: '0.02em', margin: 0 }}>
          Estimate Templates
        </h1>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            style={{
              paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text1)', fontSize: 13, width: 200,
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={handleNew}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
            opacity: creating ? 0.6 : 1,
          }}
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <FileText size={32} style={{ color: 'var(--text3)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6, fontFamily: headingFont }}>
            {search ? 'No templates match your search' : 'No templates yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            {search ? 'Try a different search term.' : 'Create reusable estimate templates to speed up your quoting process.'}
          </div>
          {!search && (
            <button
              onClick={handleNew}
              disabled={creating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
              }}
            >
              <Plus size={14} /> Create First Template
            </button>
          )}
        </div>
      )}

      {/* Template grid */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(t => {
            const accentColor = CATEGORY_COLORS[t.category || 'custom'] || 'var(--text3)'
            const itemCount = Array.isArray(t.line_items) ? t.line_items.length : 0
            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Color stripe */}
                <div style={{ height: 3, background: accentColor }} />

                <div style={{ padding: '14px 16px', flex: 1 }}>
                  {/* Category badge */}
                  <div style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    background: `${accentColor}20`, color: accentColor,
                    fontSize: 10, fontWeight: 800, fontFamily: headingFont,
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                  }}>
                    {categoryLabel(t.category || 'custom')}
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont, marginBottom: 4, lineHeight: 1.2 }}>
                    {t.name}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, lineHeight: 1.4 }}>
                      {t.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                    <span style={{ fontFamily: monoFont }}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                    <span style={{ fontFamily: monoFont }}>Used {t.use_count || 0}×</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '10px 16px', borderTop: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', flex: 1 }}>
                    Updated {fmtDate(t.updated_at)}
                  </span>
                  <button
                    onClick={() => handleDuplicate(t)}
                    title="Duplicate"
                    style={{
                      padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Copy size={12} />
                  </button>
                  <Link
                    href={`/estimates/templates/${t.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text2)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    Edit <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
