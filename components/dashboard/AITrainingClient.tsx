'use client'

import { useState, useEffect } from 'react'
import { Brain, Plus, Trash2, Edit2, Check, X, ChevronRight, Loader2, BookOpen } from 'lucide-react'

interface KnowledgeEntry {
  id: string
  category: string
  title: string
  content: string | null
  active: boolean
  created_at: string
}

const CATEGORIES = [
  { key: 'Vehicle Pricing', desc: 'Pricing by vehicle type, sqft, complexity' },
  { key: 'Material Specs', desc: 'Vinyl brands, material properties, coverage' },
  { key: 'Install Tips', desc: 'Best practices for wrapping and installation' },
  { key: 'Customer FAQs', desc: 'Common customer questions and answers' },
  { key: 'Objection Handling', desc: 'How to respond to price or timeline objections' },
  { key: 'Shop Policies', desc: 'Payment terms, warranties, turnaround times' },
]

const CAT_COLORS: Record<string, string> = {
  'Vehicle Pricing': '#4f7fff',
  'Material Specs': '#22d3ee',
  'Install Tips': '#22c07a',
  'Customer FAQs': '#f59e0b',
  'Objection Handling': '#f25a5a',
  'Shop Policies': '#8b5cf6',
}

export default function AITrainingClient() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1 | 2>(1)
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => { loadEntries() }, [])

  async function loadEntries() {
    setLoading(true)
    const res = await fetch('/api/ai/knowledge')
    const data = await res.json()
    setEntries(data.entries || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    const res = await fetch('/api/ai/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, title: title.trim(), content: content.trim() }),
    })
    const data = await res.json()
    if (data.entry) {
      setEntries(prev => [data.entry, ...prev])
      setStep(1); setCategory(''); setTitle(''); setContent('')
    }
    setSaving(false)
  }

  async function handleSaveEdit(id: string) {
    await fetch('/api/ai/knowledge', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: editTitle, content: editContent }),
    })
    setEntries(prev => prev.map(e => e.id === id ? { ...e, title: editTitle, content: editContent } : e))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await fetch('/api/ai/knowledge', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const filtered = filterCat ? entries.filter(e => e.category === filterCat) : entries

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={20} style={{ color: '#8b5cf6' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            AI Training
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Train the AI assistant with shop-specific knowledge</div>
        </div>
      </div>

      {/* Add new — 2 step */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Plus size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Add Training Entry
          </span>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: step >= s ? 'var(--accent)' : 'var(--surface2)', color: step >= s ? '#fff' : 'var(--text3)', border: `1px solid ${step >= s ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}` }}>
                {s}
              </div>
              <span style={{ fontSize: 11, color: step >= s ? 'var(--text2)' : 'var(--text3)', fontWeight: step >= s ? 700 : 500 }}>
                {s === 1 ? 'Choose Category' : 'Write Content'}
              </span>
              {s < 2 && <ChevronRight size={12} style={{ color: 'var(--text3)' }} />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setStep(2) }}
                style={{
                  padding: '12px 14px', borderRadius: 8, border: `1px solid ${category === cat.key ? (CAT_COLORS[cat.key] || 'var(--accent)') : 'rgba(255,255,255,0.08)'}`,
                  background: 'var(--surface2)', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = CAT_COLORS[cat.key] || 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: CAT_COLORS[cat.key] || 'var(--accent)' }}>{cat.key}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>{cat.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: `${CAT_COLORS[category] || 'var(--accent)'}18`, color: CAT_COLORS[category] || 'var(--accent)' }}>
                {category}
              </span>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>
                Change
              </button>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Title *</div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Full Wrap Pricing for Sedans"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Content</div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Detailed information to train the AI…"
                rows={5}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAdd}
                disabled={!title.trim() || saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'not-allowed', opacity: !title.trim() || saving ? 0.5 : 1 }}
              >
                {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Check size={13} /> Add Entry</>}
              </button>
              <button
                onClick={() => { setStep(1); setTitle(''); setContent('') }}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing entries */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} style={{ color: 'var(--text3)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Knowledge Base ({entries.length} entries)
            </span>
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface)', color: 'var(--text2)', fontSize: 12 }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', padding: 24 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 10 }}>
            No entries yet. Add your first training entry above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(entry => (
              <div key={entry.id} style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${CAT_COLORS[entry.category] || 'var(--accent)'}` }}>
                {editingId === entry.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleSaveEdit(entry.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <Check size={12} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: `${CAT_COLORS[entry.category] || 'var(--accent)'}18`, color: CAT_COLORS[entry.category] || 'var(--accent)', textTransform: 'uppercase' }}>
                          {entry.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>{entry.title}</div>
                      {entry.content && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                          {entry.content}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => { setEditingId(entry.id); setEditTitle(entry.title); setEditContent(entry.content || '') }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(242,90,90,0.2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
