'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Anchor, Calendar, Navigation } from 'lucide-react'

interface DeckForgeProject {
  id: string
  name: string
  boat_name?: string | null
  boat_make?: string | null
  boat_model?: string | null
  boat_length?: number | null
  notes?: string | null
  status: string
  thumbnail_url?: string | null
  created_at: string
}

export default function DeckForgeProjectsClient() {
  const router = useRouter()
  const [projects, setProjects] = useState<DeckForgeProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    boat_name: '',
    boat_make: '',
    boat_model: '',
    boat_length: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/deckforge/projects')
      .then(r => r.json())
      .then(d => { setProjects(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const createProject = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/deckforge/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          boat_length: form.boat_length ? parseFloat(form.boat_length) : null,
        }),
      })
      const { data } = await res.json()
      if (data?.id) router.push(`/deckforge/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: '#2dd4bf22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Anchor size={20} color="#2dd4bf" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', margin: 0, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 1 }}>
                DECKFORGE
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>Boat deck template designer</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
              background: '#2dd4bf', color: '#0d0f14', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={15} /> New Project
          </button>
        </div>

        {/* Project grid */}
        {loading ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: 'center', paddingTop: 80, color: 'var(--text3)',
          }}>
            <Anchor size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ fontSize: 14, marginBottom: 8 }}>No DeckForge projects yet</p>
            <p style={{ fontSize: 12 }}>Create a project to start designing boat deck templates</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => router.push(`/deckforge/${project.id}`)}
                style={{
                  background: 'var(--surface)', border: '1px solid #1e2130',
                  borderRadius: 12, overflow: 'hidden', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#2dd4bf44'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2130'
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  height: 140, background: '#141414',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Anchor size={32} style={{ opacity: 0.15, color: '#2dd4bf' }} />
                      <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace' }}>No preview</span>
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: project.status === 'active' ? '#22c07a22' : '#9299b522',
                    color: project.status === 'active' ? '#22c07a' : '#9299b5',
                    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace',
                  }}>
                    {project.status}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 6 }}>
                    {project.name}
                  </div>
                  {project.boat_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: 12, marginBottom: 4 }}>
                      <Navigation size={11} />
                      {[project.boat_name, project.boat_make, project.boat_model].filter(Boolean).join(' · ')}
                      {project.boat_length && ` · ${project.boat_length}ft`}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: 11 }}>
                    <Calendar size={10} />
                    {fmtDate(project.created_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid #1e2130',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 20, fontFamily: 'Barlow Condensed, sans-serif' }}>
              New DeckForge Project
            </h2>

            {([
              { key: 'name', label: 'Project Name *', placeholder: 'e.g. Sea Ray Deck Template 2024' },
              { key: 'boat_name', label: 'Boat Name', placeholder: 'e.g. Summer Breeze' },
              { key: 'boat_make', label: 'Boat Make', placeholder: 'e.g. Sea Ray' },
              { key: 'boat_model', label: 'Boat Model', placeholder: 'e.g. SPX 190' },
              { key: 'boat_length', label: 'Boat Length (ft)', placeholder: '19' },
            ] as const).map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>
                  {field.label}
                </label>
                <input
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  type={field.key === 'boat_length' ? 'number' : 'text'}
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0d0f14',
                    border: '1px solid #1e2130', borderRadius: 8, color: 'var(--text1)',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={3}
                style={{
                  width: '100%', padding: '8px 12px', background: '#0d0f14',
                  border: '1px solid #1e2130', borderRadius: 8, color: 'var(--text1)',
                  fontSize: 13, resize: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: '1px solid #1e2130', borderRadius: 8,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!form.name.trim() || creating}
                style={{
                  padding: '8px 20px', background: form.name.trim() ? '#2dd4bf' : '#1e2130',
                  color: form.name.trim() ? '#0d0f14' : '#666',
                  border: 'none', borderRadius: 8, cursor: form.name.trim() ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {creating ? 'Creating...' : 'Create & Open'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
