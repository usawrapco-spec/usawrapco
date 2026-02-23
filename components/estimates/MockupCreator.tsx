'use client'

import { useState, useRef } from 'react'
import { X, Wand2, Ruler, Image, Plus, Trash2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// ─── Props ───────────────────────────────────────────────────────────────────

interface MockupCreatorProps {
  isOpen: boolean
  onClose: () => void
  lineItemId: string
  specs: Record<string, unknown>
  updateSpec: (key: string, value: unknown) => void
  vehicleInfo: string
}

type TabKey = 'quick' | 'ai' | 'trace'
type CoverageOption = 'Full' | '3/4' | 'Half' | 'Quarter' | 'Hood Only' | 'Custom'
const COVERAGE_OPTIONS: CoverageOption[] = ['Full', '3/4', 'Half', 'Quarter', 'Hood Only', 'Custom']

// ─── Theme System ─────────────────────────────────────────────────────────────

interface Theme {
  id: string
  emoji: string
  label: string
  prompt: string
}

const THEME_CATEGORIES: { label: string; themes: Theme[] }[] = [
  {
    label: 'Style',
    themes: [
      { id: 'clean-corporate', emoji: '🏢', label: 'Clean Corporate', prompt: 'clean corporate professional vehicle wrap, minimal polished business design, brand colors on white or silver, executive look' },
      { id: 'bold-aggressive', emoji: '⚡', label: 'Bold & Aggressive', prompt: 'bold aggressive vehicle wrap, strong contrast, sharp dynamic graphics, eye-catching high-impact commercial design' },
      { id: 'color-fade', emoji: '🌊', label: 'Color Fade', prompt: 'color fade gradient vehicle wrap, smooth color transition flowing front to back, multi-color blend, vibrant gradient' },
      { id: 'chrome-metallic', emoji: '✨', label: 'Chrome & Metallic', prompt: 'chrome metallic vehicle wrap, shiny reflective surface, brushed aluminum effect, silver and chrome finish' },
      { id: 'matte-stealth', emoji: '🔲', label: 'Matte Stealth', prompt: 'matte black stealth vehicle wrap, flat matte finish, subtle contrast details, aggressive minimal dark design' },
      { id: 'racing-livery', emoji: '🏎️', label: 'Racing Livery', prompt: 'motorsport racing livery vehicle wrap, sponsor stripes, number panels, race team aesthetic, F1 inspired design' },
      { id: 'luxury-premium', emoji: '💎', label: 'Luxury Premium', prompt: 'luxury premium vehicle wrap, high-end sophisticated design, gold accents, premium brand feel, elegant finish' },
      { id: 'watercolor', emoji: '🎨', label: 'Watercolor / Artistic', prompt: 'watercolor artistic vehicle wrap, brushstroke painted design, flowing artistic colors, creative hand-painted aesthetic' },
    ],
  },
  {
    label: 'Texture & Material',
    themes: [
      { id: 'brick', emoji: '🧱', label: 'Brick Wall', prompt: 'vehicle wrap with photorealistic brick wall texture covering entire surface, mortar lines visible, aged red brick, realistic stonework' },
      { id: 'wood', emoji: '🪵', label: 'Wood Grain', prompt: 'vehicle wrap with realistic reclaimed wood grain texture, natural wood panels, warm brown tones, visible grain and knots, barn board look' },
      { id: 'carbon-fiber', emoji: '💀', label: 'Carbon Fiber', prompt: 'vehicle wrap with dark carbon fiber weave pattern, sporty black carbon texture, diagonal weave, performance racing aesthetic' },
      { id: 'snake-skin', emoji: '🐍', label: 'Snake / Reptile', prompt: 'vehicle wrap with exotic snake reptile scale texture pattern across entire vehicle, bold exotic car design' },
      { id: 'stone-concrete', emoji: '🪨', label: 'Stone / Concrete', prompt: 'vehicle wrap with rough industrial stone concrete texture, gray urban material, gritty industrial look' },
      { id: 'ocean-water', emoji: '🌊', label: 'Ocean / Water', prompt: 'vehicle wrap with flowing ocean water wave pattern, blue water motion, sea wave graphics, flowing aqua texture' },
      { id: 'fire-flame', emoji: '🔥', label: 'Fire & Flame', prompt: 'vehicle wrap with hot rod fire flame design, flames running along vehicle sides, orange red yellow fire graphics' },
      { id: 'lightning', emoji: '⚡', label: 'Lightning / Electric', prompt: 'vehicle wrap with electric lightning bolt patterns, plasma energy effects, high voltage electric graphic design, blue white sparks' },
      { id: 'galaxy-space', emoji: '🌌', label: 'Galaxy / Space', prompt: 'vehicle wrap with deep space nebula design, stars and cosmos, purple and blue galactic colors, milky way texture, glowing stardust' },
      { id: 'camo', emoji: '🌿', label: 'Camo', prompt: 'vehicle wrap with military camouflage pattern, woodland digital camo design, tactical military look, muted earth tones' },
      { id: 'money-cash', emoji: '💵', label: 'Money / Cash', prompt: 'vehicle wrap with hundred dollar bill currency pattern, money print design, green and black cash aesthetic, full vehicle coverage' },
      { id: 'playing-cards', emoji: '🃏', label: 'Playing Cards', prompt: 'vehicle wrap with playing card suit design, casino aesthetic, hearts diamonds clubs spades, Vegas card game style' },
      { id: 'newspaper', emoji: '📰', label: 'Newspaper', prompt: 'vehicle wrap with black and white newspaper print texture, newsprint column pattern, editorial design, vintage press aesthetic' },
    ],
  },
  {
    label: 'Character & Mascot',
    themes: [
      { id: 'animal-mascot', emoji: '🦁', label: 'Animal Mascot', prompt: 'vehicle wrap featuring large fierce animal mascot graphic on door panel, lion eagle wolf or shark character art, bold illustrated commercial style' },
      { id: 'human-character', emoji: '👤', label: 'Human Character', prompt: 'vehicle wrap with illustrated human character mascot representing the brand, dynamic illustrated person, commercial mascot art style' },
      { id: 'robot-tech', emoji: '🤖', label: 'Robot / Tech', prompt: 'vehicle wrap with futuristic mechanical robot character, sci-fi tech aesthetic, mechanical parts design, future commercial wrap' },
      { id: 'superhero', emoji: '🦸', label: 'Superhero', prompt: 'vehicle wrap with superhero theme, cape shield and action pose design elements, bold hero graphics, comic book commercial design' },
      { id: 'cartoon', emoji: '🎭', label: 'Cartoon Style', prompt: 'vehicle wrap with flat illustrated cartoon character mascot, fun commercial cartoon art, bold thick outlined cartoon style' },
      { id: 'monster', emoji: '👹', label: 'Monster / Creature', prompt: 'vehicle wrap with edgy aggressive creature monster design, dark creature character, aggressive commercial design aesthetic' },
      { id: 'dragon', emoji: '🐉', label: 'Dragon', prompt: 'vehicle wrap featuring dragon wrapping around the vehicle body, dragon scales and wings, mythical creature illustration, epic fantasy vehicle design' },
      { id: 'eagle-patriotic', emoji: '🦅', label: 'Eagle / Patriotic', prompt: 'vehicle wrap with American eagle and patriotic flag elements, stars and stripes, bald eagle graphic, patriotic commercial design' },
    ],
  },
  {
    label: 'Abstract & Artistic',
    themes: [
      { id: 'geometric', emoji: '🔷', label: 'Geometric Shapes', prompt: 'vehicle wrap with bold geometric shapes, triangles hexagons and sharp polygons, angular commercial wrap design' },
      { id: 'flowing-lines', emoji: '〰️', label: 'Flowing Lines', prompt: 'vehicle wrap with organic curved flowing lines, fluid motion design, smooth wave line graphics across vehicle surface' },
      { id: 'explosion-burst', emoji: '💥', label: 'Explosion / Burst', prompt: 'vehicle wrap with radial burst explosion from center, starburst pattern, dynamic energy radiating outward' },
      { id: 'target-bullseye', emoji: '🎯', label: 'Target / Bullseye', prompt: 'vehicle wrap with target bullseye concentric circles design, bold circular pattern, high-impact graphic' },
      { id: 'vortex-spiral', emoji: '🌀', label: 'Vortex / Spiral', prompt: 'vehicle wrap with hypnotic vortex spiral effect, swirling spiral pattern, dynamic twist design, optical illusion wrap' },
      { id: 'blueprint', emoji: '📐', label: 'Blueprint / Technical', prompt: 'vehicle wrap with engineering blueprint technical drawing style, cyan blue technical lines on dark background, schematic design' },
      { id: 'split-design', emoji: '🖼️', label: 'Split Design', prompt: 'vehicle wrap with completely different design on each side, split concept vehicle, contrasting graphics driver and passenger side' },
      { id: 'negative-space', emoji: '⬛', label: 'Negative Space', prompt: 'vehicle wrap bold negative space design, high contrast black and white, minimal bold graphic using void and shape' },
    ],
  },
  {
    label: 'Industry',
    themes: [
      { id: 'trades', emoji: '🔧', label: 'Trades / Contractor', prompt: 'professional contractor trades vehicle wrap, tool and construction graphic elements, strong contractor brand design' },
      { id: 'plumbing', emoji: '🚿', label: 'Plumbing & HVAC', prompt: 'plumbing HVAC vehicle wrap, water pipe and tool graphics, professional home service vehicle design' },
      { id: 'landscaping', emoji: '🌿', label: 'Landscaping', prompt: 'landscaping lawn care vehicle wrap, green nature elements, grass and tree and leaf graphics, outdoor services design' },
      { id: 'construction', emoji: '🏗️', label: 'Construction', prompt: 'construction company vehicle wrap, crane hard hat and building element graphics, bold construction brand design' },
      { id: 'food', emoji: '🍕', label: 'Food & Restaurant', prompt: 'food restaurant vehicle wrap, appetizing food graphics, warm inviting colors, restaurant catering brand vehicle design' },
      { id: 'medical', emoji: '🏥', label: 'Medical / Health', prompt: 'medical health services vehicle wrap, clean professional healthcare design, medical cross and brand graphics' },
      { id: 'fitness', emoji: '💪', label: 'Fitness / Sports', prompt: 'fitness sports vehicle wrap, athletic dynamic energy design, sport motion graphics, gym brand commercial vehicle' },
      { id: 'security', emoji: '🛡️', label: 'Security', prompt: 'security company vehicle wrap, professional authority design, shield and badge graphic elements, security brand' },
      { id: 'real-estate', emoji: '🏠', label: 'Real Estate', prompt: 'real estate company vehicle wrap, professional clean design, home key and location pin graphics, realtor brand' },
      { id: 'electrical', emoji: '⚡', label: 'Electrical', prompt: 'electrical company vehicle wrap, lightning bolt and wire graphics, yellow and black colors, electrical contractor brand' },
      { id: 'pet-services', emoji: '🐾', label: 'Pet Services', prompt: 'pet services vehicle wrap, friendly cute animal graphics, paw prints and pet element design, veterinary or grooming brand' },
      { id: 'cleaning', emoji: '🧹', label: 'Cleaning Services', prompt: 'cleaning services vehicle wrap, fresh clean professional design, bubble sparkle and shine graphics, cleaning company brand' },
      { id: 'logistics', emoji: '🚛', label: 'Logistics / Delivery', prompt: 'logistics delivery vehicle wrap, speed and motion design, arrow and package element graphics, delivery courier brand' },
      { id: 'tech-it', emoji: '🔬', label: 'Tech / IT Services', prompt: 'tech IT services vehicle wrap, digital circuit board design, technology brand graphics, modern tech company commercial vehicle' },
    ],
  },
]

const ALL_THEMES = THEME_CATEGORIES.flatMap(c => c.themes)

const QUICK_COLORS = [
  { label: 'Black', hex: '#000000' },
  { label: 'White', hex: '#ffffff' },
  { label: 'Red', hex: '#e53e3e' },
  { label: 'Blue', hex: '#3182ce' },
  { label: 'Green', hex: '#38a169' },
  { label: 'Yellow', hex: '#d69e2e' },
  { label: 'Orange', hex: '#dd6b20' },
  { label: 'Purple', hex: '#805ad5' },
  { label: 'Navy', hex: '#1a365d' },
  { label: 'Silver', hex: '#a0aec0' },
  { label: 'Gold', hex: '#d4af37' },
  { label: 'Dark Gray', hex: '#2d3748' },
]

// ─── Trace Presets ────────────────────────────────────────────────────────────

interface TracePanel { id: string; name: string; length: number; width: number }

const TRACE_PRESETS: { name: string; panels: Omit<TracePanel, 'id'>[] }[] = [
  { name: 'Full Body', panels: [
    { name: 'Hood', length: 5, width: 5 }, { name: 'Roof', length: 5.5, width: 5.5 },
    { name: 'Driver Side', length: 17, width: 4.5 }, { name: 'Passenger Side', length: 17, width: 4.5 },
    { name: 'Trunk/Tailgate', length: 5, width: 4.5 }, { name: 'Front Bumper', length: 6.5, width: 2.5 },
    { name: 'Rear Bumper', length: 6.5, width: 2.5 },
  ]},
  { name: 'Hood Only', panels: [{ name: 'Hood', length: 5, width: 5 }] },
  { name: 'Roof Only', panels: [{ name: 'Roof', length: 5.5, width: 5.5 }] },
  { name: 'Doors & Sides', panels: [
    { name: 'Driver Front Door', length: 4, width: 4 }, { name: 'Driver Rear Door', length: 4, width: 4 },
    { name: 'Passenger Front Door', length: 4, width: 4 }, { name: 'Passenger Rear Door', length: 4, width: 4 },
    { name: 'Driver Rear Quarter', length: 3, width: 3.5 }, { name: 'Passenger Rear Quarter', length: 3, width: 3.5 },
  ]},
]

// ─── Shared Styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text1)', outline: 'none', fontFamily: monoFont,
}
const btnSecondary: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--accent)',
}
const btnGreen: React.CSSProperties = {
  padding: '10px', borderRadius: 9, fontWeight: 800, fontSize: 13,
  cursor: 'pointer', background: 'var(--green)', border: 'none', color: '#fff',
}
const btnCancel: React.CSSProperties = {
  padding: '10px', borderRadius: 9, fontWeight: 700, fontSize: 13,
  cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MockupCreator({
  isOpen, onClose, lineItemId, specs, updateSpec, vehicleInfo,
}: MockupCreatorProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('quick')

  // Quick Concept state
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [quickColors, setQuickColors] = useState<string[]>([])
  const [quickGenerating, setQuickGenerating] = useState(false)
  const [quickImages, setQuickImages] = useState<string[]>([])
  const [quickError, setQuickError] = useState<string | null>(null)
  const [quickSelectedUrl, setQuickSelectedUrl] = useState<string | null>(null)

  // AI tab state
  const [coverage, setCoverage] = useState<CoverageOption>((specs.mockupCoverage as CoverageOption) || 'Full')
  const [designBrief, setDesignBrief] = useState<string>((specs.mockupBrief as string) || '')
  const [brandFileUrl, setBrandFileUrl] = useState<string>((specs.mockupBrandFileUrl as string) || '')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [mockupImages, setMockupImages] = useState<string[]>([])
  const [mockupError, setMockupError] = useState<string | null>(null)

  // Trace state
  const [panels, setPanels] = useState<TracePanel[]>([{ id: '1', name: 'Panel 1', length: 0, width: 0 }])

  if (!isOpen) return null
  const mockupUrl = specs.mockupUrl as string | undefined

  // ── Quick Concept handlers ─────────────────────────────────────────────────

  function toggleTheme(id: string) {
    setSelectedThemes(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id)
      if (prev.length >= 3) return [...prev.slice(1), id] // replace oldest if >3
      return [...prev, id]
    })
    setQuickImages([])
    setQuickSelectedUrl(null)
  }

  function toggleColor(hex: string) {
    setQuickColors(prev => {
      if (prev.includes(hex)) return prev.filter(c => c !== hex)
      if (prev.length >= 2) return [prev[1], hex]
      return [...prev, hex]
    })
  }

  async function handleQuickGenerate() {
    if (selectedThemes.length === 0) {
      toast('Pick at least one theme', 'warning')
      return
    }
    setQuickGenerating(true)
    setQuickError(null)
    setQuickImages([])
    setQuickSelectedUrl(null)

    const themePrompts = selectedThemes
      .map(id => ALL_THEMES.find(t => t.id === id)?.prompt)
      .filter(Boolean)
      .join(', ')

    const colorDesc = quickColors.length > 0
      ? `color scheme: ${quickColors.map(h => QUICK_COLORS.find(c => c.hex === h)?.label || h).join(' and ')}`
      : ''

    const fullPrompt = [
      `Professional photorealistic vehicle wrap design on a ${vehicleInfo || 'commercial vehicle'}`,
      themePrompts,
      colorDesc,
      'studio photography, high resolution product render, commercial vinyl wrap installation',
    ].filter(Boolean).join(', ')

    try {
      const res = await fetch('/api/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          vehicle_type: vehicleInfo,
          style: selectedThemes[0],
          colors: quickColors.map(h => QUICK_COLORS.find(c => c.hex === h)?.label || h),
          brief: themePrompts,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const images: string[] = data.images || []
      if (images.length === 0) throw new Error('No images returned')
      setQuickImages(images)
      setQuickSelectedUrl(images[0])
      updateSpec('mockupUrl', images[0])
      toast(`${images.length} concepts generated`, 'success')
    } catch (err: any) {
      setQuickError(err.message)
    } finally {
      setQuickGenerating(false)
    }
  }

  function handleStartOver() {
    setSelectedThemes([])
    setQuickColors([])
    setQuickImages([])
    setQuickSelectedUrl(null)
    setQuickError(null)
  }

  function handleLikeThis() {
    if (quickSelectedUrl) {
      updateSpec('mockupUrl', quickSelectedUrl)
      updateSpec('mockupSelected', true)
      toast('Concept saved to job', 'success')
      onClose()
    }
  }

  // ── AI tab handlers ────────────────────────────────────────────────────────

  async function handleBrandFileUpload(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `mockup-brands/${lineItemId}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('job-images').upload(path, file, { cacheControl: '3600', upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path)
      setBrandFileUrl(urlData.publicUrl)
      updateSpec('mockupBrandFileUrl', urlData.publicUrl)
      toast('Brand file uploaded', 'success')
    } catch {
      toast('Failed to upload brand file', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleGenerateMockup() {
    if (!designBrief.trim()) { toast('Please describe the design first', 'warning'); return }
    setGenerating(true)
    setMockupError(null)
    setMockupImages([])
    const prompt = [`Vehicle: ${vehicleInfo}`, `Coverage: ${coverage}`, `Design: ${designBrief}`, brandFileUrl ? `Brand: ${brandFileUrl}` : ''].filter(Boolean).join('\n')
    updateSpec('mockupPrompt', prompt)
    updateSpec('mockupCoverage', coverage)
    updateSpec('mockupBrief', designBrief)
    try {
      const res = await fetch('/api/generate-mockup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, vehicle_type: vehicleInfo, style: coverage, colors: [], brief: designBrief }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const images: string[] = data.images || []
      setMockupImages(images)
      if (images.length > 0) { updateSpec('mockupUrl', images[0]); toast(`${images.length} mockups generated`, 'success') }
      else throw new Error('No images returned')
    } catch (err: any) {
      setMockupError(err.message)
      toast('Generation failed: ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  function handleUseMockup() {
    if (mockupUrl) { updateSpec('mockupSelected', true); toast('Mockup applied to line item', 'success'); onClose() }
  }

  function handleDownloadMockup() {
    if (mockupUrl) {
      const a = document.createElement('a'); a.href = mockupUrl as string
      a.download = `mockup-${lineItemId}.png`; a.click()
    }
  }

  // ── Trace handlers ─────────────────────────────────────────────────────────

  function addPanel() { setPanels(prev => [...prev, { id: `p-${Date.now()}`, name: `Panel ${prev.length + 1}`, length: 0, width: 0 }]) }
  function removePanel(id: string) { setPanels(prev => prev.filter(p => p.id !== id)) }
  function updatePanel(id: string, field: keyof TracePanel, value: string | number) {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }
  function loadPreset(preset: (typeof TRACE_PRESETS)[0]) {
    setPanels(preset.panels.map((p, i) => ({ id: `preset-${i}-${Date.now()}`, ...p })))
  }
  const totalSqft = panels.reduce((sum, p) => sum + p.length * p.width, 0)
  function handleUseSqft() { updateSpec('vinylArea', Math.round(totalSqft)); toast(`Vinyl area set to ${Math.round(totalSqft)} sqft`, 'success'); onClose() }

  // ── Tab style ──────────────────────────────────────────────────────────────

  const tabBtn = (key: TabKey): React.CSSProperties => ({
    flex: 1, padding: '11px 0', background: 'transparent', border: 'none',
    borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
    color: activeTab === key ? 'var(--accent)' : 'var(--text3)',
    fontSize: 11, fontWeight: 800, fontFamily: headingFont, textTransform: 'uppercase',
    letterSpacing: '0.06em', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  })

  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block', width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'mockup-spin 0.6s linear infinite',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 12px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 900, fontFamily: headingFont, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mockup Creator
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
              {vehicleInfo || 'Vehicle TBD'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setActiveTab('quick')} style={tabBtn('quick')}><Zap size={12} />Quick Concept</button>
          <button onClick={() => setActiveTab('ai')} style={tabBtn('ai')}><Wand2 size={12} />AI Design</button>
          <button onClick={() => setActiveTab('trace')} style={tabBtn('trace')}><Ruler size={12} />Template Trace</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* ── QUICK CONCEPT TAB ── */}
          {activeTab === 'quick' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* If images generated, show results */}
              {quickImages.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ ...labelStyle, fontSize: 10 }}>
                    {selectedThemes.map(id => ALL_THEMES.find(t => t.id === id)?.emoji + ' ' + ALL_THEMES.find(t => t.id === id)?.label).join(' · ')} — {quickImages.length} concepts generated
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {quickImages.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => { setQuickSelectedUrl(url); updateSpec('mockupUrl', url) }}
                        style={{ borderRadius: 9, overflow: 'hidden', cursor: 'pointer', position: 'relative', border: quickSelectedUrl === url ? '2px solid var(--accent)' : '2px solid var(--border)' }}
                      >
                        <img src={url} alt={`Concept ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                        {quickSelectedUrl === url && (
                          <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'rgba(0,0,0,0.6)', fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: headingFont }}>
                          Concept {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleStartOver} style={{ ...btnCancel, flex: 1, fontSize: 12 }}>Start Over</button>
                    <button onClick={handleLikeThis} disabled={!quickSelectedUrl} style={{ ...btnGreen, flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: quickSelectedUrl ? 1 : 0.5 }}>
                      I Like This One — Save to Job
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step 1 hint */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)', borderRadius: 8 }}>
                    <span style={{ fontSize: 22 }}>⚡</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', fontFamily: headingFont }}>4 TAPS TO A CONCEPT</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Pick themes → pick colors → generate. No brief needed.</div>
                    </div>
                  </div>

                  {/* Theme picker */}
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 10 }}>
                      Pick 1–3 Themes {selectedThemes.length > 0 && <span style={{ color: 'var(--accent)' }}>({selectedThemes.length} selected)</span>}
                    </div>
                    {THEME_CATEGORIES.map(cat => (
                      <div key={cat.label} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: headingFont }}>
                          {cat.label}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 5 }}>
                          {cat.themes.map(theme => {
                            const active = selectedThemes.includes(theme.id)
                            return (
                              <button
                                key={theme.id}
                                onClick={() => toggleTheme(theme.id)}
                                style={{
                                  padding: '7px 4px', borderRadius: 7, cursor: 'pointer',
                                  border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                                  background: active ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                  transition: 'all 0.12s ease',
                                }}
                              >
                                <span style={{ fontSize: 18 }}>{theme.emoji}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text3)', fontFamily: headingFont, textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  {theme.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Color picker */}
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>
                      Pick Up To 2 Colors (optional) {quickColors.length > 0 && <span style={{ color: 'var(--accent)' }}>({quickColors.length} selected)</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {QUICK_COLORS.map(c => {
                        const active = quickColors.includes(c.hex)
                        return (
                          <button
                            key={c.hex}
                            onClick={() => toggleColor(c.hex)}
                            title={c.label}
                            style={{
                              width: 34, height: 34, borderRadius: 7, cursor: 'pointer',
                              background: c.hex,
                              border: active ? '3px solid var(--accent)' : '2px solid var(--border)',
                              boxShadow: active ? '0 0 0 2px rgba(79,127,255,0.4)' : 'none',
                              transition: 'all 0.12s ease',
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Error */}
                  {quickError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                      {quickError}
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleQuickGenerate}
                    disabled={quickGenerating || selectedThemes.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '14px 16px', borderRadius: 10, fontWeight: 900, fontSize: 14,
                      fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em',
                      cursor: quickGenerating || selectedThemes.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: quickGenerating || selectedThemes.length === 0 ? 0.5 : 1,
                      background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                      border: 'none', color: '#fff',
                    }}
                  >
                    {quickGenerating ? <><span style={spinnerStyle} />Generating 4 Concepts...</> : <><Zap size={15} />Generate 4 Concepts</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── AI DESIGN TAB ── */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Coverage */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Coverage</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {COVERAGE_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setCoverage(opt)} style={{
                      padding: '8px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                      fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                      cursor: 'pointer',
                      border: coverage === opt ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: coverage === opt ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                      color: coverage === opt ? 'var(--accent)' : 'var(--text2)',
                    }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Design brief */}
              <div>
                <div style={labelStyle}>Design Brief</div>
                <textarea
                  value={designBrief}
                  onChange={e => setDesignBrief(e.target.value)}
                  placeholder="Describe the design: colors, style, brand elements, references..."
                  rows={4}
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 80 }}
                />
              </div>

              {/* Brand file */}
              <div>
                <div style={labelStyle}>Brand File (Optional)</div>
                <input ref={fileInputRef} type="file" accept="image/*,.svg,.ai,.eps,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleBrandFileUpload(f) }} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ ...btnSecondary, opacity: uploading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Image size={12} />{uploading ? 'Uploading...' : 'Upload Logo / Brand File'}
                  </button>
                  {brandFileUrl && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>File attached</span>}
                </div>
              </div>

              {/* Generate button */}
              <button onClick={handleGenerateMockup} disabled={generating || !designBrief.trim()} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 10, fontWeight: 900, fontSize: 13,
                fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: generating || !designBrief.trim() ? 'not-allowed' : 'pointer',
                opacity: generating || !designBrief.trim() ? 0.5 : 1,
                background: 'linear-gradient(135deg, var(--accent), var(--purple))', border: 'none', color: '#fff',
              }}>
                {generating ? <><span style={spinnerStyle} />Generating...</> : <><Wand2 size={14} />Generate Mockup</>}
              </button>

              {mockupError && (
                <div style={{ padding: '10px 14px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                  {mockupError}
                </div>
              )}

              {mockupImages.length > 0 && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>Select a mockup ({mockupImages.length} generated)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {mockupImages.map((url, i) => (
                      <div key={i} onClick={() => updateSpec('mockupUrl', url)} style={{ borderRadius: 8, overflow: 'hidden', border: mockupUrl === url ? '2px solid var(--accent)' : '2px solid var(--border)', cursor: 'pointer', position: 'relative' }}>
                        <img src={url} alt={`Mockup ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                        {mockupUrl === url && <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mockupUrl && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <img src={mockupUrl as string} alt="Generated mockup" style={{ width: '100%', display: 'block', borderRadius: '10px 10px 0 0' }} />
                  <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
                    <button onClick={handleDownloadMockup} style={{ ...btnSecondary, flex: 1 }}>Download</button>
                    <button onClick={handleUseMockup} style={{ ...btnGreen, flex: 1 }}>Use This</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TEMPLATE TRACE TAB ── */}
          {activeTab === 'trace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundImage: 'linear-gradient(rgba(90,96,128,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(90,96,128,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <Ruler size={24} style={{ color: 'var(--text3)' }} />
                <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Vehicle Silhouette Canvas</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>Define wrap zones by area. Use presets or add panels manually.</span>
              </div>

              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Quick Presets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TRACE_PRESETS.map(p => <button key={p.name} onClick={() => loadPreset(p)} style={btnSecondary}>{p.name}</button>)}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={labelStyle}>Panel Dimensions (ft)</div>
                  <button onClick={addPanel} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', color: 'var(--green)' }}>
                    <Plus size={11} /> Add Panel
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 32px', gap: 6, padding: '0 0 4px 0' }}>
                    <span style={{ ...labelStyle, marginBottom: 0 }}>Area Name</span>
                    <span style={{ ...labelStyle, marginBottom: 0, textAlign: 'center' }}>Length</span>
                    <span style={{ ...labelStyle, marginBottom: 0, textAlign: 'center' }}>Width</span>
                    <span style={{ ...labelStyle, marginBottom: 0, textAlign: 'right' }}>Sqft</span>
                    <span />
                  </div>
                  {panels.map(panel => (
                    <div key={panel.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 32px', gap: 6, alignItems: 'center' }}>
                      <input value={panel.name} onChange={e => updatePanel(panel.id, 'name', e.target.value)} style={{ ...inputStyle, fontFamily: 'inherit' }} placeholder="Area name" />
                      <input type="number" value={panel.length || ''} onChange={e => updatePanel(panel.id, 'length', Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} min={0} step={0.5} />
                      <input type="number" value={panel.width || ''} onChange={e => updatePanel(panel.id, 'width', Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} min={0} step={0.5} />
                      <div style={{ fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: 'var(--text1)', textAlign: 'right' }}>{Math.round(panel.length * panel.width * 100) / 100}</div>
                      <button onClick={() => removePanel(panel.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Panels</span>
                  <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{panels.length}</span>
                </div>
                <div style={{ borderTop: '2px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Area</span>
                  <span style={{ fontFamily: monoFont, fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{Math.round(totalSqft * 100) / 100} sqft</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ ...btnCancel, flex: 1 }}>Cancel</button>
          {activeTab === 'trace' && (
            <button onClick={handleUseSqft} disabled={totalSqft <= 0} style={{ ...btnGreen, flex: 1, opacity: totalSqft <= 0 ? 0.5 : 1, cursor: totalSqft <= 0 ? 'not-allowed' : 'pointer' }}>
              Use This Sqft ({Math.round(totalSqft)})
            </button>
          )}
          {activeTab === 'ai' && !mockupUrl && (
            <button onClick={handleGenerateMockup} disabled={generating || !designBrief.trim()} style={{ ...btnGreen, flex: 1, background: 'linear-gradient(135deg, var(--accent), var(--purple))', opacity: generating || !designBrief.trim() ? 0.5 : 1, cursor: generating || !designBrief.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {generating ? <><span style={spinnerStyle} />Generating...</> : <><Wand2 size={13} />Generate</>}
            </button>
          )}
          {activeTab === 'ai' && mockupUrl && (
            <button onClick={handleUseMockup} style={{ ...btnGreen, flex: 1 }}>Use This Mockup</button>
          )}
          {activeTab === 'quick' && quickImages.length > 0 && !quickSelectedUrl && (
            <button onClick={handleStartOver} style={{ ...btnSecondary, flex: 1 }}>Start Over</button>
          )}
        </div>
      </div>

      <style>{`@keyframes mockup-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
