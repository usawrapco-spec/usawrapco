'use client'

import { useState, useCallback } from 'react'
import {
  BarChart2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Type, ListChecks, Star, ToggleLeft, AlignLeft, Hash, Calendar,
  Copy, Eye, Check, Save, Loader2, X, ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Question types ──────────────────────────────────────────────────────────
const QUESTION_TYPES = [
  { id: 'text',       label: 'Short Text',   icon: Type,       desc: 'One-line answer' },
  { id: 'textarea',   label: 'Long Text',    icon: AlignLeft,  desc: 'Multi-line answer' },
  { id: 'select',     label: 'Dropdown',     icon: ChevronDown,desc: 'Select one option' },
  { id: 'radio',      label: 'Single Choice',icon: ListChecks, desc: 'Pick one from list' },
  { id: 'checkbox',   label: 'Multi Choice', icon: ListChecks, desc: 'Pick multiple' },
  { id: 'rating',     label: 'Star Rating',  icon: Star,       desc: '1-5 star rating' },
  { id: 'nps',        label: 'NPS Score',    icon: Hash,       desc: '0-10 score' },
  { id: 'yesno',      label: 'Yes / No',     icon: ToggleLeft, desc: 'Binary choice' },
  { id: 'date',       label: 'Date',         icon: Calendar,   desc: 'Date picker' },
] as const

type QuestionType = typeof QUESTION_TYPES[number]['id']

interface Question {
  _key: string
  type: QuestionType
  label: string
  required: boolean
  options: string[] // for select, radio, checkbox
  placeholder: string
}

interface Survey {
  id: string | null
  title: string
  description: string
  questions: Question[]
  status: 'draft' | 'live'
  thank_you_message: string
}

let _k = 0
function nk() { return `q${++_k}` }

function defaultQuestion(): Question {
  return { _key: nk(), type: 'text', label: '', required: false, options: [''], placeholder: '' }
}

// ── Pre-built templates ─────────────────────────────────────────────────────
const TEMPLATES: { label: string; desc: string; survey: Omit<Survey, 'id' | 'status'> }[] = [
  {
    label: 'Post-Install Satisfaction',
    desc: 'Send after job completion',
    survey: {
      title: 'How was your wrap experience?',
      description: 'We value your feedback — it helps us improve and keep delivering top-quality work.',
      thank_you_message: 'Thank you for your feedback! We appreciate your business.',
      questions: [
        { _key: nk(), type: 'rating', label: 'Overall, how would you rate your experience with USA Wrap Co?', required: true, options: [], placeholder: '' },
        { _key: nk(), type: 'nps', label: 'How likely are you to recommend us to a friend or colleague?', required: true, options: [], placeholder: '' },
        { _key: nk(), type: 'radio', label: 'How was the quality of the installation?', required: true, options: ['Exceptional', 'Good', 'Acceptable', 'Needs improvement'], placeholder: '' },
        { _key: nk(), type: 'radio', label: 'How was communication throughout the project?', required: true, options: ['Excellent — kept me informed', 'Good — no issues', 'Could be better', 'Poor'], placeholder: '' },
        { _key: nk(), type: 'yesno', label: 'Was your vehicle completed on or before the promised date?', required: true, options: [], placeholder: '' },
        { _key: nk(), type: 'textarea', label: 'Any additional feedback, suggestions, or shout-outs for our team?', required: false, options: [], placeholder: 'We read every response...' },
      ],
    },
  },
  {
    label: 'Fleet Decision-Maker Survey',
    desc: 'Pre-sales fleet qualification',
    survey: {
      title: 'Fleet Wrap Needs Assessment',
      description: 'Help us understand your fleet so we can prepare the best proposal for your business.',
      thank_you_message: 'Thanks! Our fleet specialist will reach out within 1 business day.',
      questions: [
        { _key: nk(), type: 'text', label: 'Company name', required: true, options: [], placeholder: 'Acme Plumbing' },
        { _key: nk(), type: 'select', label: 'Fleet size', required: true, options: ['1-5 vehicles', '6-20 vehicles', '21-50 vehicles', '50+ vehicles'], placeholder: '' },
        { _key: nk(), type: 'checkbox', label: 'Vehicle types in your fleet', required: true, options: ['Sedans', 'SUVs', 'Pickup Trucks', 'Cargo Vans', 'Sprinters / Hi-Roof Vans', 'Box Trucks', 'Trailers'], placeholder: '' },
        { _key: nk(), type: 'radio', label: 'Wrap coverage needed', required: true, options: ['Full wraps', 'Partial / half wraps', 'Spot graphics / decals only', 'Not sure yet'], placeholder: '' },
        { _key: nk(), type: 'radio', label: 'Timeline', required: true, options: ['ASAP — within 2 weeks', 'Within 1 month', 'Within 3 months', 'Planning for next quarter'], placeholder: '' },
        { _key: nk(), type: 'textarea', label: 'Anything else we should know?', required: false, options: [], placeholder: '' },
      ],
    },
  },
]

export default function SurveyBuilderPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [editing, setEditing] = useState<Survey | null>(null)
  const [saving, setSaving] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)

  // ── Create from template ────────────────────────────────────────────────
  function startFromTemplate(tpl: typeof TEMPLATES[number]) {
    const s: Survey = { id: null, status: 'draft', ...tpl.survey }
    setEditing(s)
    setShowTemplates(false)
  }

  function startBlank() {
    setEditing({
      id: null, status: 'draft', title: '', description: '',
      questions: [defaultQuestion()], thank_you_message: 'Thank you for your response!',
    })
    setShowTemplates(false)
  }

  // ── Question CRUD ───────────────────────────────────────────────────────
  function addQuestion() {
    if (!editing) return
    const q = defaultQuestion()
    setEditing({ ...editing, questions: [...editing.questions, q] })
    setExpandedQ(q._key)
  }

  function updateQuestion(key: string, patch: Partial<Question>) {
    if (!editing) return
    setEditing({
      ...editing,
      questions: editing.questions.map(q => q._key === key ? { ...q, ...patch } : q),
    })
  }

  function removeQuestion(key: string) {
    if (!editing) return
    setEditing({ ...editing, questions: editing.questions.filter(q => q._key !== key) })
  }

  function moveQuestion(key: string, dir: -1 | 1) {
    if (!editing) return
    const idx = editing.questions.findIndex(q => q._key === key)
    if (idx < 0) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= editing.questions.length) return
    const qs = [...editing.questions]
    ;[qs[idx], qs[newIdx]] = [qs[newIdx], qs[idx]]
    setEditing({ ...editing, questions: qs })
  }

  function addOption(key: string) {
    if (!editing) return
    setEditing({
      ...editing,
      questions: editing.questions.map(q =>
        q._key === key ? { ...q, options: [...q.options, ''] } : q
      ),
    })
  }

  function updateOption(key: string, idx: number, val: string) {
    if (!editing) return
    setEditing({
      ...editing,
      questions: editing.questions.map(q => {
        if (q._key !== key) return q
        const opts = [...q.options]
        opts[idx] = val
        return { ...q, options: opts }
      }),
    })
  }

  function removeOption(key: string, idx: number) {
    if (!editing) return
    setEditing({
      ...editing,
      questions: editing.questions.map(q => {
        if (q._key !== key) return q
        return { ...q, options: q.options.filter((_, i) => i !== idx) }
      }),
    })
  }

  // ── Save survey (to local state for now — DB table can be added later) ──
  async function saveSurvey() {
    if (!editing) return
    setSaving(true)
    // Simulate save — in production this would POST to /api/surveys
    await new Promise(r => setTimeout(r, 600))
    const saved = { ...editing, id: editing.id || crypto.randomUUID() }
    setSurveys(prev => {
      const idx = prev.findIndex(s => s.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    setEditing(saved)
    setSaving(false)
  }

  const hasOptions = (type: QuestionType) => ['select', 'radio', 'checkbox'].includes(type)

  // ── Editor view ───────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 860, margin: '0 auto' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => setEditing(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            ← Back to Surveys
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{
              padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
              background: editing.status === 'live' ? 'rgba(34,192,122,0.15)' : 'rgba(90,96,128,0.18)',
              color: editing.status === 'live' ? '#22c07a' : '#5a6080',
              border: `1px solid ${editing.status === 'live' ? '#22c07a40' : '#2a2d3e'}`,
            }}>
              {editing.status === 'live' ? 'Live' : 'Draft'}
            </span>
            <button
              onClick={saveSurvey} disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)', color: '#fff',
                border: 'none', borderRadius: 7, padding: '0.5rem 1rem', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Survey'}
            </button>
          </div>
        </div>

        {/* Survey meta */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <input
            value={editing.title}
            onChange={e => setEditing({ ...editing, title: e.target.value })}
            placeholder="Survey Title"
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text1)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          />
          <textarea
            value={editing.description}
            onChange={e => setEditing({ ...editing, description: e.target.value })}
            placeholder="Add a description shown at the top of the survey..."
            rows={2}
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid #2a2d3e',
              borderRadius: 8, color: 'var(--text2)', fontSize: '0.85rem', padding: '0.5rem 0.75rem',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Questions */}
        {editing.questions.map((q, qi) => {
          const isOpen = expandedQ === q._key
          const TypeIcon = QUESTION_TYPES.find(t => t.id === q.type)?.icon || Type

          return (
            <div key={q._key} style={{
              background: 'var(--surface)', border: `1px solid ${isOpen ? '#4f7fff40' : 'var(--surface2)'}`,
              borderRadius: 10, marginBottom: '0.6rem', transition: 'border-color 0.15s',
            }}>
              {/* Question header */}
              <div
                onClick={() => setExpandedQ(isOpen ? null : q._key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.75rem 1rem', cursor: 'pointer',
                }}
              >
                <GripVertical size={14} color="var(--text3)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text3)', fontSize: '0.75rem', fontWeight: 700, width: 24 }}>
                  {qi + 1}.
                </span>
                <TypeIcon size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, color: q.label ? 'var(--text1)' : 'var(--text3)', fontSize: '0.85rem', fontWeight: 500 }}>
                  {q.label || 'Untitled question'}
                </span>
                {q.required && <span style={{ color: '#f25a5a', fontSize: '0.7rem', fontWeight: 700 }}>Required</span>}
                <button
                  onClick={e => { e.stopPropagation(); moveQuestion(q._key, -1) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
                ><ChevronUp size={13} /></button>
                <button
                  onClick={e => { e.stopPropagation(); moveQuestion(q._key, 1) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
                ><ChevronDown size={13} /></button>
                <button
                  onClick={e => { e.stopPropagation(); removeQuestion(q._key) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f25a5a', padding: 2 }}
                ><Trash2 size={13} /></button>
              </div>

              {/* Expanded editor */}
              {isOpen && (
                <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--surface2)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text3)', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Question Text
                      </label>
                      <input
                        value={q.label}
                        onChange={e => updateQuestion(q._key, { label: e.target.value })}
                        placeholder="Type your question..."
                        style={{
                          width: '100%', background: 'var(--surface2)', border: '1px solid #2a2d3e',
                          borderRadius: 6, color: 'var(--text1)', fontSize: '0.85rem', padding: '0.5rem 0.6rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text3)', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Type
                      </label>
                      <select
                        value={q.type}
                        onChange={e => updateQuestion(q._key, { type: e.target.value as QuestionType })}
                        style={{
                          background: 'var(--surface2)', border: '1px solid #2a2d3e',
                          borderRadius: 6, color: 'var(--text1)', fontSize: '0.82rem', padding: '0.5rem',
                          outline: 'none',
                        }}
                      >
                        {QUESTION_TYPES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Options for select/radio/checkbox */}
                  {hasOptions(q.type) && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', color: 'var(--text3)', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Options
                      </label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text3)', fontSize: '0.8rem', width: 20, textAlign: 'right', lineHeight: '32px' }}>
                            {oi + 1}.
                          </span>
                          <input
                            value={opt}
                            onChange={e => updateOption(q._key, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            style={{
                              flex: 1, background: 'var(--surface2)', border: '1px solid #2a2d3e',
                              borderRadius: 5, color: 'var(--text1)', fontSize: '0.82rem', padding: '0.35rem 0.5rem',
                              outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => removeOption(q._key, oi)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f25a5a', padding: 2 }}
                          ><X size={12} /></button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(q._key)}
                        style={{
                          background: 'none', border: '1px dashed #2a2d3e', borderRadius: 5,
                          color: 'var(--text3)', cursor: 'pointer', fontSize: '0.78rem', padding: '0.3rem 0.6rem',
                          display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem',
                        }}
                      >
                        <Plus size={11} /> Add option
                      </button>
                    </div>
                  )}

                  {/* Required toggle */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => updateQuestion(q._key, { required: !q.required })}
                      style={{
                        width: 36, height: 20, borderRadius: 10, cursor: 'pointer', border: 'none',
                        background: q.required ? '#4f7fff' : 'var(--surface2)',
                        position: 'relative', transition: 'background 0.15s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: q.required ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.15s',
                      }} />
                    </button>
                    <span style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>Required</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add question */}
        <button
          onClick={addQuestion}
          style={{
            width: '100%', background: 'var(--surface)', border: '1px dashed #2a2d3e',
            borderRadius: 10, padding: '0.75rem', cursor: 'pointer',
            color: 'var(--text2)', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            marginBottom: '1.5rem',
          }}
        >
          <Plus size={15} /> Add Question
        </button>

        {/* Thank you message */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text2)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Thank You Message (shown after submit)
          </label>
          <textarea
            value={editing.thank_you_message}
            onChange={e => setEditing({ ...editing, thank_you_message: e.target.value })}
            rows={2}
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid #2a2d3e',
              borderRadius: 8, color: 'var(--text1)', fontSize: '0.85rem', padding: '0.5rem 0.75rem',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    )
  }

  // ── Template picker overlay ─────────────────────────────────────────────
  if (showTemplates) {
    return (
      <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <button
          onClick={() => setShowTemplates(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1.5rem' }}
        >
          ← Back
        </button>
        <h2 style={{ color: 'var(--text1)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Choose a Template
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Start from a pre-built survey or create your own from scratch.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Blank */}
          <button
            onClick={startBlank}
            style={{
              background: 'var(--surface)', border: '1px dashed #2a2d3e',
              borderRadius: 10, padding: '1.25rem', cursor: 'pointer',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}
          >
            <Plus size={20} color="var(--text3)" />
            <div>
              <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: '0.9rem' }}>Blank Survey</div>
              <div style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>Start from scratch</div>
            </div>
          </button>

          {/* Templates */}
          {TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => startFromTemplate(tpl)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--surface2)',
                borderRadius: 10, padding: '1.25rem', cursor: 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem',
                transition: 'border-color 0.15s',
              }}
            >
              <BarChart2 size={20} color="#4f7fff" />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: '0.9rem' }}>{tpl.label}</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>{tpl.desc} — {tpl.survey.questions.length} questions</div>
              </div>
              <ArrowRight size={15} color="var(--text3)" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Survey list (default) ─────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <BarChart2 size={20} color="#4f7fff" />
            <h1 style={{ color: 'var(--text1)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Survey Builder
            </h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0 }}>
            Create and manage customer surveys for your website and email campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          style={{
            background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.6rem 1.25rem', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}
        >
          <Plus size={15} /> Create Survey
        </button>
      </div>

      {/* Saved surveys */}
      {surveys.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {surveys.map(s => (
            <div key={s.id} style={{
              background: 'var(--surface)', border: '1px solid var(--surface2)',
              borderRadius: 10, padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <BarChart2 size={18} color="#4f7fff" />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: '0.9rem' }}>{s.title || 'Untitled'}</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>{s.questions.length} questions</div>
              </div>
              <span style={{
                padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600,
                background: s.status === 'live' ? 'rgba(34,192,122,0.15)' : 'rgba(90,96,128,0.18)',
                color: s.status === 'live' ? '#22c07a' : '#5a6080',
              }}>
                {s.status === 'live' ? 'Live' : 'Draft'}
              </span>
              <button
                onClick={() => setEditing(s)}
                style={{
                  background: 'var(--surface2)', border: '1px solid #2a2d3e',
                  borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer',
                  color: 'var(--text2)', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '4rem 1rem',
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12,
        }}>
          <BarChart2 size={40} color="var(--text3)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text1)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No surveys yet
          </h3>
          <p style={{ color: 'var(--text3)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Create your first customer survey from a template or start blank.
          </p>
          <button
            onClick={() => setShowTemplates(true)}
            style={{
              background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '0.6rem 1.5rem', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            }}
          >
            <Plus size={15} /> Create Your First Survey
          </button>
        </div>
      )}
    </div>
  )
}
