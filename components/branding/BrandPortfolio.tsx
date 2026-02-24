'use client'

import { useState } from 'react'
import { Phone, Mail, Globe, MapPin, Instagram, Facebook, Linkedin, Youtube, Check, Pencil, ArrowRight, Star, MessageCircle } from 'lucide-react'

interface BrandPortfolioProps {
  portfolio: any
  editMode?: boolean
  onSaveEdits?: (edits: any) => Promise<void>
}

const COVERAGE_OPTIONS = [
  { label: 'Full Wrap', desc: 'Maximum brand impact — 360° coverage', multiplier: 1.0 },
  { label: '3/4 Wrap', desc: 'Sides + rear — bold and noticeable', multiplier: 0.75 },
  { label: 'Partial Wrap', desc: 'Hood + sides — clean and professional', multiplier: 0.5 },
  { label: 'Lettering Only', desc: 'Contact info + logo — cost-effective', multiplier: 0.2 },
]

const BASE_PRICE = 3200

function colorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const max = Math.max(r, g, b)
  if (max < 50) return 'Near Black'
  if (r > 200 && g > 200 && b > 200) return 'Light'
  if (r > 180 && g < 80 && b < 80) return 'Red'
  if (r < 80 && g > 150 && b < 80) return 'Green'
  if (r < 80 && g < 80 && b > 180) return 'Blue'
  if (r > 180 && g > 150 && b < 80) return 'Gold / Yellow'
  if (r > 150 && g < 100 && b > 150) return 'Purple'
  if (r > 180 && g > 100 && b < 80) return 'Orange'
  if (r > 140 && g > 140 && b > 140) return 'Gray'
  return 'Brand Color'
}

export default function BrandPortfolio({ portfolio, editMode = false, onSaveEdits }: BrandPortfolioProps) {
  const [edits, setEdits] = useState<any>(portfolio.customer_edits || {})
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Merge customer edits on top of original data
  const data = { ...portfolio, ...edits }
  const colors: any[] = data.brand_colors || []
  const services: string[] = data.services || []
  const primaryColor = colors[0]?.hex || '#4f7fff'
  const socialLinks: Record<string, string> = data.social_links || {}

  // Parse AI analysis
  let aiAnalysis: any = {}
  try {
    if (typeof data.ai_brand_analysis === 'string') {
      aiAnalysis = JSON.parse(data.ai_brand_analysis)
    } else if (typeof data.ai_brand_analysis === 'object') {
      aiAnalysis = data.ai_brand_analysis || {}
    }
  } catch { aiAnalysis = {} }

  const saveEdits = async () => {
    if (!onSaveEdits) return
    setSaving(true)
    await onSaveEdits(edits)
    setSaving(false)
    setEditingSection(null)
  }

  const edit = (key: string, val: any) => setEdits((p: any) => ({ ...p, [key]: val }))

  const EditBtn = ({ section }: { section: string }) =>
    editMode ? (
      <button
        onClick={() => setEditingSection(editingSection === section ? null : section)}
        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
      >
        <Pencil size={10} />
        Edit
      </button>
    ) : null

  const S: Record<string, React.CSSProperties> = {
    page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e8eaed', background: '#0d0f14', minHeight: '100vh' },
    section: { maxWidth: 860, margin: '0 auto', padding: '40px 20px' },
    card: { background: '#13151c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 32px', marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 20 },
    h2: { fontSize: 26, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, system-ui, sans-serif', marginBottom: 4 },
    label: { fontSize: 10, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  }

  return (
    <div style={S.page}>

      {/* ── SECTION A: HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}40 0%, ${primaryColor}15 50%, #0d0f14 100%)`,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '60px 20px 40px',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Logo */}
        {(data.logo_url || data.ogImage) && (
          <div style={{ marginBottom: 20 }}>
            <img
              src={edits.logo_url || data.logo_url || data.ogImage}
              alt={data.company_name}
              style={{ height: 80, maxWidth: 240, objectFit: 'contain', margin: '0 auto', display: 'block', borderRadius: 8 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        {/* Company name */}
        {editMode && editingSection === 'header' ? (
          <input
            value={edits.company_name ?? data.company_name}
            onChange={e => edit('company_name', e.target.value)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 28, fontWeight: 900, textAlign: 'center', padding: '4px 12px', marginBottom: 8 }}
          />
        ) : (
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8, fontFamily: 'Barlow Condensed, system-ui, sans-serif' }}>
            {data.company_name || 'Your Company'}
          </h1>
        )}

        {/* Tagline */}
        {editMode && editingSection === 'header' ? (
          <input
            value={edits.tagline ?? data.tagline}
            onChange={e => edit('tagline', e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', padding: '4px 12px', marginBottom: 16, width: '100%', maxWidth: 480 }}
          />
        ) : (
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', marginBottom: 20 }}>
            {data.tagline || ''}
          </p>
        )}

        {/* Contact chips */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {data.website_url && (
            <a href={data.website_url} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 20, color: '#fff', fontSize: 12, textDecoration: 'none' }}>
              <Globe size={12} /> {new URL(data.website_url.startsWith('http') ? data.website_url : 'https://' + data.website_url).hostname}
            </a>
          )}
          {data.phone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 20, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              <Phone size={12} /> {data.phone}
            </span>
          )}
          {data.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 20, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              <Mail size={12} /> {data.email}
            </span>
          )}
        </div>

        <div style={{ position: 'absolute', top: 16, right: 20 }}>
          <EditBtn section="header" />
        </div>
        {editMode && editingSection === 'header' && (
          <button onClick={saveEdits} style={{ marginTop: 12, padding: '8px 20px', background: '#22c07a', border: 'none', borderRadius: 8, color: '#0d1a0d', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div style={S.section}>

        {/* ── SECTION B: BRAND IDENTITY ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Color Palette */}
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={S.sectionTitle}>YOUR BRAND COLORS</div>
              <EditBtn section="colors" />
            </div>
            {colors.length === 0 && (
              <div style={{ color: '#5a6080', fontSize: 13 }}>No colors detected — add your brand colors below</div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {colors.map((c: any, i: number) => {
                const hex = typeof c === 'string' ? c : c.hex
                const name = c.name || colorName(hex)
                const label = i === 0 ? 'Primary' : i === 1 ? 'Secondary' : i === 2 ? 'Accent' : 'Brand'
                return (
                  <div key={hex} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: 12,
                      background: hex, marginBottom: 6,
                      border: '2px solid rgba(255,255,255,0.1)',
                      boxShadow: `0 4px 16px ${hex}40`,
                    }} />
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#9299b5' }}>{hex}</div>
                    <div style={{ fontSize: 10, color: '#5a6080' }}>{name}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: hex, marginTop: 2 }}>{label}</div>
                  </div>
                )
              })}
            </div>
            {editMode && editingSection === 'colors' && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="color" defaultValue={colors[0]?.hex || '#4f7fff'}
                  onChange={e => {
                    const updated = [...colors]
                    updated[0] = { ...(updated[0] || {}), hex: e.target.value }
                    edit('brand_colors', updated)
                  }}
                  title="Primary color"
                  style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 8 }} />
                <input type="color" defaultValue={colors[1]?.hex || '#22c07a'}
                  onChange={e => {
                    const updated = [...colors]
                    updated[1] = { ...(updated[1] || {}), hex: e.target.value }
                    edit('brand_colors', updated)
                  }}
                  title="Secondary color"
                  style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 8 }} />
                <button onClick={saveEdits} style={{ padding: '8px 16px', background: '#22c07a', border: 'none', borderRadius: 8, color: '#0d1a0d', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Brand Personality */}
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={S.sectionTitle}>YOUR BRAND VOICE</div>
              <EditBtn section="personality" />
            </div>

            {aiAnalysis.headline && (
              <div style={{ fontSize: 18, fontStyle: 'italic', color: primaryColor, fontWeight: 700, marginBottom: 16, lineHeight: 1.4, fontFamily: 'Barlow Condensed, system-ui, sans-serif' }}>
                "{aiAnalysis.headline}"
              </div>
            )}

            <p style={{ fontSize: 13, color: '#9299b5', lineHeight: 1.7, marginBottom: 16 }}>
              {aiAnalysis.brand_personality || data.about_text?.slice(0, 200) || 'Your brand analysis will appear here after website analysis.'}
            </p>

            {aiAnalysis.brand_keywords?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {aiAnalysis.brand_keywords.map((kw: string) => (
                  <span key={kw} style={{ padding: '4px 10px', background: `${primaryColor}15`, border: `1px solid ${primaryColor}30`, borderRadius: 20, fontSize: 11, fontWeight: 700, color: primaryColor }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION C: SERVICES ── */}
        {services.length > 0 && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={S.sectionTitle}>WHAT YOU DO</div>
              <EditBtn section="services" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {(aiAnalysis.clean_services || services).map((svc: string, i: number) => (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${primaryColor}25`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: 13, color: '#e8eaed', lineHeight: 1.4 }}>{svc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION D: WRAP RECOMMENDATION ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>YOUR WRAP STRATEGY</div>
          {aiAnalysis.wrap_recommendation && (
            <p style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.7, marginBottom: 24 }}>
              {aiAnalysis.wrap_recommendation}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {COVERAGE_OPTIONS.map((opt, i) => {
              const price = Math.round(BASE_PRICE * opt.multiplier / 100) * 100
              return (
                <div key={opt.label} style={{
                  padding: '16px', borderRadius: 12,
                  background: i === 0 ? `${primaryColor}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === 0 ? primaryColor + '40' : 'rgba(255,255,255,0.06)'}`,
                  textAlign: 'center',
                }}>
                  {i === 0 && (
                    <div style={{ fontSize: 9, fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Most Popular</div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#5a6080', marginBottom: 12, lineHeight: 1.4 }}>{opt.desc}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: primaryColor, fontFamily: 'JetBrains Mono, monospace' }}>
                    ${price.toLocaleString()}+
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SECTION E: LOGO DISPLAY ── */}
        {(data.logo_url || data.ogImage) && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={S.sectionTitle}>YOUR LOGO</div>
              {editMode && (
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9299b5', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px' }}>
                  <Pencil size={10} />
                  Replace Logo
                  <input type="file" accept="image/*,.pdf,.ai,.svg,.eps" style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { bg: '#ffffff', label: 'On White', textColor: '#333' },
                { bg: '#0d0f14', label: 'On Dark', textColor: '#999' },
                { bg: primaryColor, label: 'On Brand Color', textColor: '#fff' },
              ].map(({ bg, label, textColor }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ background: bg, borderRadius: 10, padding: '20px 16px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.08)', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={data.logo_url || data.ogImage}
                      alt="Logo"
                      style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: '#5a6080' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: '#5a6080', textAlign: 'center' }}>
              Logo provided by client — USA Wrap Co can assist with logo updates and vectorization
            </div>
          </div>
        )}

        {/* ── SECTION F: CONTACT & NEXT STEPS ── */}
        <div style={{ ...S.card, background: `linear-gradient(135deg, ${primaryColor}15 0%, rgba(19,21,28,0.8) 100%)`, border: `1px solid ${primaryColor}25` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, system-ui, sans-serif', marginBottom: 8 }}>
                Ready to bring your brand to the road?
              </div>
              <p style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.7, marginBottom: 20 }}>
                USA Wrap Co transforms vehicles into powerful brand statements. Let's build something that gets noticed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: Phone, text: '253-525-8148' },
                  { icon: Mail, text: 'sales@usawrapco.com' },
                  { icon: Globe, text: 'usawrapco.com' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9299b5' }}>
                    <Icon size={14} style={{ color: primaryColor, flexShrink: 0 }} />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              <a href="tel:2535258148" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                background: primaryColor, color: '#fff', textDecoration: 'none', textAlign: 'center',
              }}>
                <Phone size={16} />
                Schedule Consultation
              </a>
              <a href="mailto:sales@usawrapco.com" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                background: 'rgba(255,255,255,0.06)', color: '#e8eaed', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <MessageCircle size={16} />
                Get Final Quote
              </a>
            </div>
          </div>
        </div>

        {/* Social links */}
        {Object.keys(socialLinks).length > 0 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            {Object.entries(socialLinks).map(([platform, link]) => {
              const Icon = platform === 'instagram' ? Instagram : platform === 'facebook' ? Facebook : platform === 'linkedin' ? Linkedin : platform === 'youtube' ? Youtube : Globe
              return (
                <a key={platform} href={link} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: '#9299b5', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icon size={15} />
                </a>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: '#5a6080' }}>
            Branding portfolio prepared by USA Wrap Co · {new Date().getFullYear()}
          </div>
          {data.ai_brand_analysis && (
            <div style={{ fontSize: 10, color: '#3a3f55', marginTop: 4 }}>Brand analysis powered by AI</div>
          )}
        </div>

      </div>
    </div>
  )
}
