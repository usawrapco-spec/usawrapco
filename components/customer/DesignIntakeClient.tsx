'use client'

import { useState, useEffect } from 'react'
import { Upload, CheckCircle, ChevronRight, ArrowLeft, ThumbsUp, MessageSquare } from 'lucide-react'

interface Props { token: string }

interface EstimateInfo {
  number: string
  customerName: string
  proposalConfig?: { mode: string; zones?: unknown[] } | null
  designBrief?: {
    wrapAreas?: string[]; logoStatus?: string; brandColors?: string[];
    tagline?: string; phone?: string; website?: string; style?: string; noWrap?: string; notes?: string;
  } | null
  concepts?: { url: string; approved?: boolean; customerNotes?: string }[]
}

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27',
  accent: '#4f7fff', green: '#22c07a', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  border: 'rgba(255,255,255,0.07)', purple: '#8b5cf6',
}

const WRAP_AREAS = ['Full Wrap', 'Partial', 'Hood Only', 'Roof', 'Sides', 'Rear', 'Cab', 'Custom']
const LOGO_STATUS = ['Has logo file', 'Needs design', 'Sending later']
const STYLES = ['Bold', 'Clean', 'Techy', 'Classic', 'Playful', 'Minimalist']

type SectionKey = 'brand' | 'upload' | 'concepts' | 'done'

export default function DesignIntakeClient({ token }: Props) {
  const [est, setEst] = useState<EstimateInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<SectionKey>('brand')

  // Brief state
  const [wrapAreas, setWrapAreas] = useState<string[]>([])
  const [logoStatus, setLogoStatus] = useState('')
  const [brandColors, setBrandColors] = useState(['', '', ''])
  const [tagline, setTagline] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [style, setStyle] = useState('')
  const [noWrap, setNoWrap] = useState('')
  const [notes, setNotes] = useState('')

  // Concepts state
  const [concepts, setConcepts] = useState<{ url: string; approved?: boolean; customerNotes?: string }[]>([])
  const [conceptNotes, setConceptNotes] = useState<Record<number, string>>({})

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/estimates/view/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setEst(data)
          const brief = data.designBrief
          if (brief) {
            setWrapAreas(brief.wrapAreas || [])
            setLogoStatus(brief.logoStatus || '')
            setBrandColors(brief.brandColors || ['', '', ''])
            setTagline(brief.tagline || '')
            setPhone(brief.phone || '')
            setWebsite(brief.website || '')
            setStyle(brief.style || '')
            setNoWrap(brief.noWrap || '')
            setNotes(brief.notes || '')
          }
          setConcepts(data.concepts || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await fetch(`/api/estimates/design-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          designBrief: { wrapAreas, logoStatus, brandColors, tagline, phone, website, style, noWrap, notes },
          conceptFeedback: Object.entries(conceptNotes).map(([i, note]) => ({ index: Number(i), note, approved: concepts[Number(i)]?.approved })),
        }),
      })
      setSubmitted(true)
      setSection('done')
    } catch { /* swallow */ }
    setSubmitting(false)
  }

  const pill = (active: boolean, color = C.accent): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
    border: active ? `1.5px solid ${color}` : `1px solid ${C.border}`,
    background: active ? color + '20' : C.surface,
    color: active ? color : C.text2,
  })

  const fi: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  const label: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3, fontSize: 14 }}>
        Loading your design portal...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, fontFamily: 'system-ui, sans-serif', padding: '24px 16px 80px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            USA Wrap Co — Design Portal
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text1, margin: '0 0 4px', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {est?.number || 'Design Intake'}
          </h1>
          <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
            Help us bring your vision to life, {est?.customerName?.split(' ')[0] || 'there'}
          </p>
        </div>

        {/* Section nav */}
        {section !== 'done' && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, justifyContent: 'center' }}>
            {(['brand', 'upload', 'concepts'] as SectionKey[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  background: section === s ? C.accent : ((['brand', 'upload', 'concepts'].indexOf(section) > i) ? C.green : C.surface),
                  color: section === s || ['brand', 'upload', 'concepts'].indexOf(section) > i ? '#fff' : C.text3,
                  border: `1px solid ${C.border}`,
                }}>
                  {['brand', 'upload', 'concepts'].indexOf(section) > i ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: section === s ? C.accent : C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s === 'brand' ? 'Brand' : s === 'upload' ? 'Files' : 'Concepts'}
                </span>
                {i < 2 && <ChevronRight size={12} style={{ color: C.text3 }} />}
              </div>
            ))}
          </div>
        )}

        {/* Brand Section */}
        {section === 'brand' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>Brand & Design Brief</div>
              <div style={{ fontSize: 12, color: C.text2 }}>Tell us about your wrap. This helps our designers nail it the first time.</div>
            </div>

            <div>
              <label style={label}>What would you like wrapped?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WRAP_AREAS.map(a => (
                  <button key={a} onClick={() => setWrapAreas(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])} style={pill(wrapAreas.includes(a), C.green)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={label}>What should NOT be wrapped?</label>
              <input value={noWrap} onChange={e => setNoWrap(e.target.value)} placeholder="e.g. leave door handles, keep existing decals..." style={fi} />
            </div>

            <div>
              <label style={label}>Logo / Artwork Status</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LOGO_STATUS.map(s => <button key={s} onClick={() => setLogoStatus(s)} style={pill(logoStatus === s)}>{s}</button>)}
              </div>
            </div>

            <div>
              <label style={label}>Brand Colors</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={brandColors[i] || '#ffffff'} onChange={e => { const c = [...brandColors]; c[i] = e.target.value; setBrandColors(c) }} style={{ width: 36, height: 36, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 2, background: C.bg, flexShrink: 0 }} />
                      <input value={brandColors[i]} onChange={e => { const c = [...brandColors]; c[i] = e.target.value; setBrandColors(c) }} placeholder={`Color ${i + 1}`} style={{ ...fi, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={label}>Tagline</label>
                <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Your tagline" style={fi} />
              </div>
              <div>
                <label style={label}>Phone on Wrap</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" style={fi} />
              </div>
              <div>
                <label style={label}>Website on Wrap</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.yourbiz.com" style={fi} />
              </div>
            </div>

            <div>
              <label style={label}>Style Direction</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STYLES.map(s => <button key={s} onClick={() => setStyle(s)} style={pill(style === s, C.purple)}>{s}</button>)}
              </div>
            </div>

            <div>
              <label style={label}>Additional Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any other details, inspiration, or special requests..." rows={3} style={{ ...fi, resize: 'vertical' as const }} />
            </div>

            <button onClick={() => setSection('upload')} style={{
              padding: '14px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Next: Upload Files <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Upload Section */}
        {section === 'upload' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>Upload Your Files</div>
              <div style={{ fontSize: 12, color: C.text2 }}>Logos, brand guidelines, reference images — anything you have helps.</div>
            </div>

            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', borderRadius: 12, border: `2px dashed ${C.border}`,
              cursor: 'pointer', marginBottom: 16,
            }}>
              <Upload size={32} style={{ color: C.text3, marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text2, marginBottom: 4 }}>Tap to choose files</div>
              <div style={{ fontSize: 12, color: C.text3 }}>PNG, SVG, AI, PDF, JPG — up to 50MB each</div>
              <input type="file" accept=".png,.svg,.ai,.pdf,.jpg,.jpeg,.eps" multiple style={{ display: 'none' }} onChange={async e => {
                if (!e.target.files) return
                for (const file of Array.from(e.target.files)) {
                  const fd = new FormData()
                  fd.append('file', file)
                  fd.append('token', token)
                  await fetch('/api/estimates/design-intake/upload', { method: 'POST', body: fd }).catch(() => {})
                }
              }} />
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSection('brand')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={() => setSection('concepts')} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Next: View Concepts <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Concepts Section */}
        {section === 'concepts' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>Design Concepts</div>
              <div style={{ fontSize: 12, color: C.text2 }}>Review any concepts our team has created. Let us know what you think!</div>
            </div>

            {concepts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: C.text3, fontSize: 13, marginBottom: 20 }}>
                No concepts yet — our team will create some after reviewing your brief. Check back soon!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                {concepts.map((c, i) => (
                  <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${c.approved ? C.green : C.border}`, background: C.surface2 }}>
                    <img src={c.url} alt={`Concept ${i + 1}`} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <button onClick={() => setConcepts(p => p.map((x, j) => j === i ? { ...x, approved: !x.approved } : x))}
                          style={{ ...pill(!!c.approved, C.green), display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ThumbsUp size={12} /> {c.approved ? 'Approved!' : 'I like this'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <MessageSquare size={13} style={{ color: C.text3, marginTop: 2, flexShrink: 0 }} />
                        <textarea
                          value={conceptNotes[i] || ''}
                          onChange={e => setConceptNotes(p => ({ ...p, [i]: e.target.value }))}
                          placeholder="Leave a note or request changes..."
                          rows={2}
                          style={{ ...fi, fontSize: 12, resize: 'vertical' as const, flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSection('upload')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: submitting ? C.surface2 : C.green, color: submitting ? C.text3 : '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle size={14} /> {submitting ? 'Submitting...' : 'Submit Design Brief'}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {section === 'done' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.green + '20', border: `2px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} style={{ color: C.green }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
              Design Brief Submitted!
            </div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
              Thank you! Our design team will review your brief and be in touch soon with concepts.
              {' '}You can come back to this link at any time to review updates.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
