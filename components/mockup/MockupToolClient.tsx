'use client'

import { useState } from 'react'
import { Wand2, Download, RefreshCw, AlertCircle, ImageIcon, Save, Globe, Check, Palette, Building2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props { profile: Profile }

const VEHICLE_TYPES = [
  'Cargo Van', 'Sprinter Van', 'Box Truck', 'Semi Truck', 'Pickup Truck',
  'SUV', 'Sedan', 'Trailer', 'Bus', 'Food Truck',
]
const VEHICLE_COLORS = ['White', 'Black', 'Silver', 'Gray', 'Blue', 'Red']
const WRAP_STYLES = [
  'Full color change', 'Company branding / logo', 'Bold geometric design',
  'Minimalist clean look', 'Aggressive / racing style', 'Luxury / premium look',
  'Nature / landscape theme', 'Technology / digital theme',
]

export default function MockupToolClient({ profile }: Props) {
  const [vehicleType, setVehicleType]   = useState('Cargo Van')
  const [vehicleColor, setVehicleColor] = useState('White')
  const [wrapStyle, setWrapStyle]       = useState('Company branding / logo')
  const [colors, setColors]             = useState('')
  const [description, setDescription]  = useState('')
  const [generating, setGenerating]     = useState(false)
  const [error, setError]               = useState('')
  const [predictionId, setPredictionId] = useState('')
  const [imageUrl, setImageUrl]         = useState('')
  const [pollCount, setPollCount]       = useState(0)
  const [saved, setSaved]               = useState(false)
  const supabase = createClient()

  // Brand profile state
  const [websiteUrl, setWebsiteUrl]   = useState('')
  const [scraping, setScraping]       = useState(false)
  const [brandProfile, setBrandProfile] = useState<any>(null)
  const [editingProfile, setEditingProfile] = useState(false)

  const scrapeWebsite = async () => {
    if (!websiteUrl) return
    setScraping(true)
    try {
      const res = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      })
      const json = await res.json()
      if (json.data) {
        const d = json.data
        setBrandProfile({
          companyName: d.companyName || d.name || '',
          logoUrl: d.logoUrl || '',
          tagline: d.tagline || '',
          colors: d.colors || [],
          phone: d.phone || '',
          email: d.email || '',
          services: d.services || [],
        })
        // Auto-fill colors and description
        const hexColors = (d.colors || []).map((c: any) => typeof c === 'string' ? c : c.hex).filter(Boolean)
        if (hexColors.length > 0) setColors(hexColors.slice(0, 3).join(', '))
        if (d.companyName || d.name) {
          const co = d.companyName || d.name
          setDescription(prev => prev || `Vehicle wrap for ${co}. Include company name prominently. Professional commercial branding.`)
        }
        // Run AI analysis in background to enhance prompt
        fetch('/api/analyze-brand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: d.companyName,
            url: websiteUrl,
            tagline: d.tagline,
            colors: d.colors,
            services: d.services,
            aboutText: d.aboutText,
          }),
        }).then(r => r.json()).then(aiJson => {
          if (aiJson.analysis?.enhanced_prompt) {
            setBrandProfile((prev: any) => ({ ...prev, aiAnalysis: aiJson.analysis }))
            setDescription(aiJson.analysis.enhanced_prompt)
          }
        }).catch((error) => { console.error(error); })
      }
    } catch { /* silent */ }
    setScraping(false)
  }

  const generate = async () => {
    setGenerating(true)
    setError('')
    setImageUrl('')

    // Build enhanced description using brand profile
    let finalDescription = description
    if (brandProfile && !finalDescription) {
      finalDescription = `Professional vehicle wrap for ${brandProfile.companyName}. Use their brand colors ${(brandProfile.colors || []).slice(0, 3).map((c: any) => typeof c === 'string' ? c : c.hex).join(', ')}. Clean commercial branding design.`
    }

    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleType, vehicleColor, wrapStyle,
          colors: colors || 'brand colors',
          designDescription: finalDescription || wrapStyle,
          style: 'commercial vehicle wrap',
          companyName: brandProfile?.companyName,
          logoUrl: brandProfile?.logoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Generation failed')
        setGenerating(false)
        return
      }
      setPredictionId(data.predictionId)
      pollForResult(data.predictionId, 0)
    } catch {
      setError('Network error. Please try again.')
      setGenerating(false)
    }
  }

  const pollForResult = async (id: string, count: number) => {
    if (count > 30) {
      setError('Generation timed out. Please try again.')
      setGenerating(false)
      return
    }
    try {
      const res = await fetch(`/api/ai/generate-mockup?id=${id}`)
      const data = await res.json()
      if (data.status === 'succeeded' && data.imageUrl) {
        setImageUrl(data.imageUrl)
        setGenerating(false)
        setPollCount(0)
      } else if (data.status === 'failed') {
        setError(data.error || 'Generation failed')
        setGenerating(false)
      } else {
        setPollCount(count + 1)
        setTimeout(() => pollForResult(id, count + 1), 2000)
      }
    } catch {
      setTimeout(() => pollForResult(id, count + 1), 2000)
    }
  }

  const saveToStorage = async () => {
    if (!imageUrl) return
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const path = `mockups/${Date.now()}_${vehicleType.replace(/\s/g, '-')}.png`
      const { error: upErr } = await supabase.storage.from('project-files').upload(path, blob)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
      // Persist to media_files so it shows up in Media Library
      await supabase.from('media_files').insert({
        bucket: 'project-files',
        file_url: publicUrl,
        file_name: `mockup_${vehicleType.replace(/\s/g, '-')}_${Date.now()}.png`,
        mime_type: 'image/png',
        file_size: blob.size,
        uploaded_by: profile.id,
        tags: ['mockup', vehicleType],
        ai_tags: [],
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* Silent fail */ }
  }

  const S: Record<string, React.CSSProperties> = {
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
    select: { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' },
    input: { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' },
  }

  const primaryColor = brandProfile?.colors?.[0]
    ? (typeof brandProfile.colors[0] === 'string' ? brandProfile.colors[0] : brandProfile.colors[0].hex)
    : '#4f7fff'

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>
          AI Mockup Tool
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Generate photorealistic vehicle wrap mockups using AI. Powered by Flux Pro.
        </p>
      </div>

      {/* Brand Profile Section */}
      <div style={{ ...S.card, marginBottom: 20, borderColor: brandProfile ? `${primaryColor}40` : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Building2 size={14} style={{ color: 'var(--text3)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>
            Brand Profile
          </span>
          {brandProfile && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c07a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={11} /> Profile Built
            </span>
          )}
        </div>

        {brandProfile && !editingProfile ? (
          /* Brand Profile Card */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {brandProfile.logoUrl && (
                <img
                  src={brandProfile.logoUrl}
                  alt="Logo"
                  style={{ height: 36, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: '4px 8px', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{brandProfile.companyName}</div>
                {brandProfile.tagline && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{brandProfile.tagline}</div>
                )}
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
              >
                <Pencil size={10} /> Edit
              </button>
            </div>
            {brandProfile.colors?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={12} style={{ color: 'var(--text3)' }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {brandProfile.colors.slice(0, 5).map((c: any, i: number) => {
                    const hex = typeof c === 'string' ? c : c.hex
                    return (
                      <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: hex, border: '1px solid rgba(255,255,255,0.1)' }} title={hex} />
                    )
                  })}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Brand colors auto-applied</span>
              </div>
            )}
            {brandProfile.aiAnalysis?.wrap_recommendation && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 8, fontSize: 12, color: '#9299b5' }}>
                <strong style={{ color: '#22c07a' }}>AI Rec: </strong>
                {brandProfile.aiAnalysis.wrap_recommendation}
              </div>
            )}
          </div>
        ) : (
          /* Website URL input */
          <div>
            {editingProfile && (
              <button onClick={() => setEditingProfile(false)} style={{ marginBottom: 10, fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ← Back to profile
              </button>
            )}
            <label style={S.label}>Customer Website (optional — auto-fills brand data)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && scrapeWebsite()}
                placeholder="https://customer-website.com"
                style={{ ...S.input, flex: 1 }}
              />
              <button
                onClick={scrapeWebsite}
                disabled={!websiteUrl || scraping}
                style={{
                  padding: '0 14px', borderRadius: 8, border: 'none',
                  background: websiteUrl ? 'var(--accent)' : 'var(--surface2)',
                  color: websiteUrl ? '#fff' : 'var(--text3)',
                  fontSize: 12, fontWeight: 700,
                  cursor: websiteUrl && !scraping ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}
              >
                <Globe size={13} />
                {scraping ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
              Extracts logo, brand colors, and company info — auto-fills the description below
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]" style={{ gap: 20 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={S.card}>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Vehicle Type</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={S.select}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Vehicle Color</label>
              <select value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} style={S.select}>
                {VEHICLE_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Wrap Style</label>
              <select value={wrapStyle} onChange={e => setWrapStyle(e.target.value)} style={S.select}>
                {WRAP_STYLES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Colors</label>
              <input
                value={colors}
                onChange={e => setColors(e.target.value)}
                placeholder="e.g. blue and white, red and black"
                style={S.input}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Additional Details</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe specific elements, logos, text, or design details..."
                rows={4}
                style={{ ...S.input, resize: 'vertical' as const }}
              />
            </div>
            <button
              onClick={generate}
              disabled={generating}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: generating ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: generating ? 'var(--text3)' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating{pollCount > 0 ? ` (${pollCount * 2}s)` : '...'}
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  {brandProfile ? `Generate for ${brandProfile.companyName || 'Client'}` : 'Generate Mockup'}
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Generated mockup"
                style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, objectFit: 'contain' }}
              />
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <a
                  href={imageUrl}
                  download="mockup.png"
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={generate}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text2)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <RefreshCw size={14} /> Regenerate
                </button>
                <button
                  onClick={saveToStorage}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: saved ? 'rgba(34,192,122,0.1)' : 'transparent',
                    color: saved ? 'var(--green)' : 'var(--text2)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Save size={14} /> {saved ? 'Saved' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <ImageIcon size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14 }}>
                {generating ? 'Generating your mockup...' : 'Configure options and click Generate'}
              </div>
              {generating && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                  This takes 20–40 seconds
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
