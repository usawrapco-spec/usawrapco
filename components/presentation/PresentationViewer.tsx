'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties } from 'react'
import {
  Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize,
  X, Share2, Copy, Check, Heart, MessageSquare, Info,
  RotateCcw, Layers, Star, Zap, Clock, Settings,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresentationSlide {
  id: string
  url: string
  label: string
  type: 'wrapped' | 'original' | 'mockup' | 'canvas'
  caption?: string
  beforeUrl?: string
}

export interface PresentationBranding {
  companyName?: string
  logoUrl?: string
  accentColor?: string
  tagline?: string
  contactInfo?: string
}

interface Props {
  slides: PresentationSlide[]
  clientName?: string
  title?: string
  branding?: PresentationBranding
  timerSeconds?: number
  onClose?: () => void
  publicMode?: boolean
  token?: string
  sessionId?: string
  onDecision?: (decision: 'love_it' | 'request_changes', feedback?: string) => void
}

// ─── Ken Burns variants ───────────────────────────────────────────────────────
const KB_ANIMS = [
  { name: 'kb1', from: 'scale(1.0) translate(0%,0%)',      to: 'scale(1.08) translate(-1.5%,-1.2%)' },
  { name: 'kb2', from: 'scale(1.0) translate(0%,0%)',      to: 'scale(1.08) translate(1.5%,-1%)' },
  { name: 'kb3', from: 'scale(1.0) translate(0%,0%)',      to: 'scale(1.09) translate(-1%,1.5%)' },
  { name: 'kb4', from: 'scale(1.06) translate(1%,1%)',     to: 'scale(1.0) translate(-1.2%,-0.8%)' },
  { name: 'kb5', from: 'scale(1.06) translate(-1%,-1%)',   to: 'scale(1.0) translate(1.2%,0.8%)' },
  { name: 'kb6', from: 'scale(1.0) translate(-1%,1%)',     to: 'scale(1.09) translate(1%,-1%)' },
]

const SPEED_OPTIONS = [
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '8s', value: 8 },
]

const SLIDE_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  wrapped:  { label: 'WRAPPED',  color: '#4f7fff' },
  original: { label: 'ORIGINAL', color: '#9299b5' },
  mockup:   { label: 'AI RENDER', color: '#8b5cf6' },
  canvas:   { label: 'RENDER',   color: '#22d3ee' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PresentationViewer({
  slides,
  clientName,
  title,
  branding = {},
  timerSeconds = 4,
  onClose,
  publicMode = false,
  token,
  onDecision,
}: Props) {
  // ── Core state ──────────────────────────────────────────────────────────
  const [current, setCurrent]             = useState(0)
  const [prevIdx, setPrevIdx]             = useState<number | null>(null)
  const [prevVariant, setPrevVariant]     = useState(0)
  const [animVariant, setAnimVariant]     = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imgLoaded, setImgLoaded]         = useState(false)
  const [prevImgLoaded, setPrevImgLoaded] = useState(false)

  // ── Playback ────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]         = useState(true)
  const [speed, setSpeed]                 = useState(timerSeconds)
  const [elapsed, setElapsed]             = useState(0)

  // ── UI visibility ───────────────────────────────────────────────────────
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showFilmstrip, setShowFilmstrip] = useState(true)
  const [showDetails, setShowDetails]     = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [showIntro, setShowIntro]         = useState(true)
  const [showOutro, setShowOutro]         = useState(false)

  // ── Compare mode ────────────────────────────────────────────────────────
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [sliderPos, setSliderPos]         = useState(50)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)

  // ── Fullscreen ──────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen]   = useState(false)

  // ── Public: star rating / decision ──────────────────────────────────────
  const [starHover, setStarHover]         = useState(0)
  const [starRating, setStarRating]       = useState(0)
  const [decisionMade, setDecisionMade]   = useState<'love_it' | 'request_changes' | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackText, setFeedbackText]   = useState('')
  const [linkCopied, setLinkCopied]       = useState(false)

  // ── Refs ────────────────────────────────────────────────────────────────
  const containerRef   = useRef<HTMLDivElement>(null)
  const filmstripRef   = useRef<HTMLDivElement>(null)
  const hideTimerRef   = useRef<NodeJS.Timeout | null>(null)
  const touchStartX    = useRef(0)
  const touchStartY    = useRef(0)
  const sliderRef      = useRef<HTMLDivElement>(null)
  const playStartRef   = useRef(Date.now())

  const slide     = slides[current]
  const prevSlide = prevIdx !== null ? slides[prevIdx] : null
  const accent    = branding.accentColor || '#4f7fff'
  const hasBA     = !!(slide?.beforeUrl) || slides.some(s => s.type === 'original' && s !== slide)

  // Get a "before" URL for the current slide — try beforeUrl first, then first 'original' slide
  const beforeUrl = slide?.beforeUrl
    || slides.find(s => s.type === 'original')?.url

  // ── Inject CSS keyframes ─────────────────────────────────────────────────
  useEffect(() => {
    const id = 'pv2-keyframes'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.innerHTML = KB_ANIMS.map(({ name, from, to }) => `
      @keyframes ${name} { from{transform:${from}} to{transform:${to}} }
    `).join('') + `
      @keyframes pvFadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes pvFadeOut { from{opacity:1} to{opacity:0} }
      @keyframes pvSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes pvPulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }
      @keyframes pvIntro   { 0%{opacity:0;transform:translateY(32px) scale(0.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes pvGrain   {
        0%  {transform:translate(0%,0%)}
        20% {transform:translate(-4%,-8%)}
        40% {transform:translate(4%,4%)}
        60% {transform:translate(-2%,6%)}
        80% {transform:translate(6%,-4%)}
        100%{transform:translate(0%,0%)}
      }
      @keyframes pvShimmer {
        0%   {opacity:0}
        50%  {opacity:1}
        100% {opacity:0}
      }
    `
    document.head.appendChild(s)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  // ── Auto-hide controls ───────────────────────────────────────────────────
  const resetHide = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500)
  }, [])

  useEffect(() => {
    resetHide()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHide])

  // ── Core navigation ───────────────────────────────────────────────────────
  const goTo = useCallback((next: number, wrap = true) => {
    if (isTransitioning || !slides.length) return
    const target = wrap
      ? ((next % slides.length) + slides.length) % slides.length
      : next

    if (target < 0 || target >= slides.length) return

    setIsTransitioning(true)
    setPrevIdx(current)
    setPrevVariant(animVariant)
    setPrevImgLoaded(true)
    setCurrent(target)
    setAnimVariant(v => (v + 1) % KB_ANIMS.length)
    setImgLoaded(false)
    setElapsed(0)
    playStartRef.current = Date.now()

    setTimeout(() => {
      setPrevIdx(null)
      setIsTransitioning(false)
    }, 600)
  }, [current, animVariant, slides.length, isTransitioning])

  const goNext = useCallback(() => {
    // In public mode, show outro after last slide
    if (publicMode && current === slides.length - 1 && !showOutro) {
      setShowOutro(true)
      setIsPlaying(false)
      return
    }
    goTo(current + 1)
  }, [current, slides.length, publicMode, showOutro, goTo])

  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])

  // ── Auto-play with elapsed tracker ───────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || showIntro || showOutro || decisionMade) return
    setElapsed(0)
    playStartRef.current = Date.now()

    const tick = setInterval(() => {
      setElapsed(Math.min((Date.now() - playStartRef.current) / 1000, speed))
    }, 80)

    const adv = setTimeout(goNext, speed * 1000)
    return () => { clearInterval(tick); clearTimeout(adv) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, current, showIntro, showOutro, decisionMade])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') { if (showFeedbackForm) { setShowFeedbackForm(false) } else if (onClose) { onClose() } }
      if (e.key === 'f') toggleFullscreen()
      if (e.key === 'p') setIsPlaying(v => !v)
      resetHide()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [goNext, goPrev, onClose, resetHide, showFeedbackForm])

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // ── Filmstrip auto-scroll ─────────────────────────────────────────────────
  useEffect(() => {
    if (!filmstripRef.current || !showFilmstrip) return
    const el = filmstripRef.current
    const thumb = el.querySelector(`[data-slide="${current}"]`) as HTMLElement
    if (thumb) {
      el.scrollTo({ left: thumb.offsetLeft - el.clientWidth / 2 + thumb.offsetWidth / 2, behavior: 'smooth' })
    }
  }, [current, showFilmstrip])

  // ── Touch swipe ───────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    resetHide()
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 50 && dy < 80) {
      dx < 0 ? goNext() : goPrev()
    }
    resetHide()
  }

  // ── Before/After drag ─────────────────────────────────────────────────────
  const onSliderMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingSlider || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
    setSliderPos(Math.max(5, Math.min(95, ((cx - rect.left) / rect.width) * 100)))
  }, [isDraggingSlider])

  useEffect(() => {
    const up = () => setIsDraggingSlider(false)
    window.addEventListener('mousemove', onSliderMove)
    window.addEventListener('touchmove', onSliderMove, { passive: true })
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', onSliderMove)
      window.removeEventListener('touchmove', onSliderMove)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [onSliderMove])

  // ── Share ─────────────────────────────────────────────────────────────────
  const copyLink = () => {
    if (!token) return
    navigator.clipboard.writeText(`${window.location.origin}/presentation/${token}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  // ── Public decision ───────────────────────────────────────────────────────
  const handleDecision = (d: 'love_it' | 'request_changes', fb?: string) => {
    setDecisionMade(d)
    setShowFeedbackForm(false)
    if (onDecision) onDecision(d, fb)
  }

  const handleStarRating = (n: number) => {
    setStarRating(n)
    if (n >= 4) {
      handleDecision('love_it')
    } else {
      setShowFeedbackForm(true)
    }
  }

  // ── Circular progress math ────────────────────────────────────────────────
  const R    = 15
  const CIRC = 2 * Math.PI * R
  const pct  = isPlaying && !showIntro ? Math.min(elapsed / speed, 1) : 0
  const dash = CIRC * (1 - pct)

  // ─── INTRO SCREEN ─────────────────────────────────────────────────────────
  if (showIntro && slides.length) {
    return (
      <div
        ref={containerRef}
        onClick={() => { setShowIntro(false); playStartRef.current = Date.now() }}
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', overflow: 'hidden', cursor: 'pointer' }}
      >
        {/* Blurred first slide as background */}
        <img
          src={slides[0].url}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'blur(60px) brightness(0.2) saturate(1.4)',
            transform: 'scale(1.15)', pointerEvents: 'none',
          }}
        />

        {/* Grain overlay */}
        <GrainOverlay />

        {/* Cinematic letterbox bars */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />

        {/* Content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          padding: '80px 48px', textAlign: 'center',
        }}>
          {/* Prepared by */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: accent,
            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12,
            animation: 'pvIntro 1s 0.2s both',
          }}>
            Prepared by {branding.companyName || 'USA Wrap Co'}
          </div>

          {/* Divider */}
          <div style={{
            width: 48, height: 2, background: accent, borderRadius: 1, marginBottom: 28,
            animation: 'pvIntro 1s 0.3s both',
          }} />

          {/* Client name */}
          <h1 style={{
            fontSize: 'clamp(40px, 9vw, 88px)',
            fontWeight: 900, color: '#fff',
            fontFamily: 'Barlow Condensed, sans-serif',
            lineHeight: 1.0, margin: 0, marginBottom: 24,
            animation: 'pvIntro 1s 0.4s both',
            textShadow: '0 4px 32px rgba(0,0,0,0.8)',
          }}>
            {clientName || title || 'Your Custom Wrap'}
          </h1>

          {/* Slide count */}
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 48,
            animation: 'pvIntro 1s 0.55s both',
          }}>
            {slides.length} view{slides.length !== 1 ? 's' : ''} of your wrap design
          </div>

          {/* CTA */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '13px 32px', borderRadius: 50,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
            fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
            animation: 'pvIntro 1s 0.7s both, pvPulse 2.5s 1.8s ease infinite',
          }}>
            <Play size={15} fill="currentColor" />
            Tap anywhere to begin
          </div>
        </div>
      </div>
    )
  }

  // ─── DECISION MADE ────────────────────────────────────────────────────────
  if (decisionMade && publicMode) {
    const isLoveit = decisionMade === 'love_it'
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#000', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Blurred bg */}
        {slide && (
          <img src={slide.url} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'blur(50px) brightness(0.15) saturate(1.3)',
            transform: 'scale(1.1)',
          }} />
        )}
        <GrainOverlay />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 500, padding: '0 32px', animation: 'pvIntro 0.8s ease both' }}>
          {/* Icon */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%', margin: '0 auto 28px',
            background: isLoveit ? 'rgba(34,192,122,0.15)' : 'rgba(245,158,11,0.15)',
            border: `2px solid ${isLoveit ? '#22c07a' : '#f59e0b'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${isLoveit ? 'rgba(34,192,122,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            {isLoveit
              ? <Heart size={40} fill="#22c07a" color="#22c07a" />
              : <MessageSquare size={40} color="#f59e0b" />
            }
          </div>

          {starRating > 0 && isLoveit && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={20} fill={n <= starRating ? '#f59e0b' : 'none'} color={n <= starRating ? '#f59e0b' : 'rgba(255,255,255,0.2)'} />
              ))}
            </div>
          )}

          <h2 style={{ fontSize: 48, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12 }}>
            {isLoveit ? "Let's Do This!" : 'Feedback Received!'}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 32 }}>
            {isLoveit
              ? "We've received your approval. Our team will reach out shortly to finalize your project."
              : "Thank you for your feedback. Our designer will review your notes and follow up with updates."}
          </p>

          {branding.contactInfo && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 50,
              background: `${accent}15`, border: `1px solid ${accent}40`,
              fontSize: 13, color: accent, fontWeight: 600,
            }}>
              {branding.contactInfo}
            </div>
          )}

          {/* Powered by */}
          <div style={{ marginTop: 48, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
            Powered by {branding.companyName || 'USA Wrap Co'}
          </div>
        </div>
      </div>
    )
  }

  const kbAnim     = KB_ANIMS[animVariant % KB_ANIMS.length]
  const prevKbAnim = KB_ANIMS[prevVariant % KB_ANIMS.length]

  // ─── MAIN VIEWER ──────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onMouseMove={resetHide}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', overflow: 'hidden', userSelect: 'none' }}
    >
      {/* ══ IMAGE LAYERS ═══════════════════════════════════════════════════ */}

      {/* Previous slide — fades out during transition */}
      {prevSlide && prevIdx !== null && (
        <div key={`prev-${prevIdx}`} style={{ position: 'absolute', inset: 0, animation: 'pvFadeOut 0.6s ease forwards', zIndex: 1 }}>
          <AmbientLayer url={prevSlide.url} />
          <img
            src={prevSlide.url}
            alt={prevSlide.label}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'contain',
              animation: prevImgLoaded ? `${prevKbAnim.name} ${speed}s ease-in-out both` : 'none',
              willChange: 'transform',
            }}
          />
        </div>
      )}

      {/* Current slide — fades in */}
      {slide && (
        <div key={`curr-${current}`} style={{
          position: 'absolute', inset: 0, zIndex: 2,
          animation: prevSlide ? 'pvFadeIn 0.6s ease forwards' : 'none',
          opacity: prevSlide ? undefined : 1,
        }}>
          {/* Compare mode: before image underneath */}
          {showBeforeAfter && beforeUrl && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <AmbientLayer url={beforeUrl} />
              <img src={beforeUrl} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}

          {/* Main image container (clipped in compare mode) */}
          <div style={{
            position: 'absolute', inset: 0,
            clipPath: showBeforeAfter && beforeUrl ? `inset(0 ${100 - sliderPos}% 0 0)` : undefined,
          }}>
            <AmbientLayer url={slide.url} />
            <img
              key={`img-${current}`}
              src={slide.url}
              alt={slide.label}
              onLoad={() => setImgLoaded(true)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'contain',
                animation: imgLoaded && isPlaying ? `${kbAnim.name} ${speed}s ease-in-out both` : 'none',
                willChange: 'transform',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.35s ease',
              }}
            />
          </div>

          {/* Compare divider */}
          {showBeforeAfter && beforeUrl && (
            <div ref={sliderRef} style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
              <div
                onMouseDown={() => setIsDraggingSlider(true)}
                onTouchStart={e => { e.stopPropagation(); setIsDraggingSlider(true) }}
                style={{
                  position: 'absolute', left: `${sliderPos}%`, top: 0, bottom: 0,
                  width: 4, background: '#fff', cursor: 'col-resize',
                  transform: 'translateX(-50%)',
                  boxShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.3)',
                }}
              >
                {/* Handle */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize',
                }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 16, background: '#444', borderRadius: 2 }} />)}
                  </div>
                </div>
              </div>
              {/* Labels */}
              <div style={baLabelStyle('left')}>BEFORE</div>
              <div style={baLabelStyle('right')}>AFTER</div>
            </div>
          )}
        </div>
      )}

      {/* No slides */}
      {!slide && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <Layers size={64} color="rgba(255,255,255,0.08)" />
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>No images added yet</p>
        </div>
      )}

      {/* ══ OVERLAYS ════════════════════════════════════════════════════════ */}

      {/* Grain */}
      <GrainOverlay />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Slide type badge */}
      {slide && (
        <div style={{
          position: 'absolute', top: 72, left: 20, zIndex: 20,
          padding: '3px 10px', borderRadius: 20,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          border: `1px solid ${SLIDE_TYPE_BADGE[slide.type]?.color || '#5a6080'}40`,
          fontSize: 9, fontWeight: 900, letterSpacing: '0.2em',
          color: SLIDE_TYPE_BADGE[slide.type]?.color || '#9299b5',
          opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}>
          {SLIDE_TYPE_BADGE[slide.type]?.label || slide.type.toUpperCase()}
        </div>
      )}

      {/* Slide counter */}
      {slides.length > 1 && (
        <div style={{
          position: 'absolute', top: 72, right: 20, zIndex: 20,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
          color: 'rgba(255,255,255,0.5)',
          opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}>
          {current + 1} <span style={{ color: 'rgba(255,255,255,0.2)' }}>/ {slides.length}</span>
        </div>
      )}

      {/* Caption */}
      {slide?.caption && (
        <div style={{
          position: 'absolute', bottom: showFilmstrip ? 180 : 120, left: '50%', transform: 'translateX(-50%)',
          maxWidth: 560, textAlign: 'center', zIndex: 20,
          fontSize: 17, fontStyle: 'italic', color: 'rgba(255,255,255,0.65)',
          textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}>
          &ldquo;{slide.caption}&rdquo;
        </div>
      )}

      {/* ══ TOP BAR ═════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease',
        pointerEvents: controlsVisible ? 'auto' : 'none',
      }}>
        {/* Logo / branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
          {branding.logoUrl
            ? <img src={branding.logoUrl} alt="Logo" style={{ height: 26, objectFit: 'contain' }} />
            : <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
                {branding.companyName || 'USA WRAP CO'}
              </span>
          }
        </div>

        {/* Center: slide label */}
        {slide && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center' }}>
            {slide.label}
          </div>
        )}

        {/* Right: close or spacer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120, justifyContent: 'flex-end' }}>
          {!publicMode && onClose && (
            <button onClick={onClose} style={topBtnSt} title="Close (Esc)">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ══ DETAILS PANEL ════════════════════════════════════════════════════ */}
      {showDetails && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 40,
          width: 284, background: 'rgba(8,10,16,0.92)', backdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          animation: 'pvSlideUp 0.3s ease both',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Details</span>
            <button onClick={() => setShowDetails(false)} style={iconBtnSt}><X size={13} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {clientName && <DetailRow label="Client" value={clientName} />}
            {title && <DetailRow label="Project" value={title} />}
            <DetailRow label="Total Views" value={`${slides.length}`} />
            <DetailRow label="Wrapped" value={`${slides.filter(s => s.type === 'wrapped' || s.type === 'canvas').length}`} />
            {slides.some(s => s.type === 'original') && (
              <DetailRow label="Originals" value={`${slides.filter(s => s.type === 'original').length}`} />
            )}
            {slides.some(s => s.type === 'mockup') && (
              <DetailRow label="AI Renders" value={`${slides.filter(s => s.type === 'mockup').length}`} />
            )}

            <div style={{ marginTop: 20, height: 1, background: 'rgba(255,255,255,0.06)' }} />

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 10 }}>SLIDES</div>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i, false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 10px', borderRadius: 8, marginBottom: 3,
                    background: i === current ? `${accent}18` : 'transparent',
                    border: `1px solid ${i === current ? `${accent}50` : 'transparent'}`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {/* Thumb */}
                  <div style={{ width: 40, height: 26, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
                    <img src={s.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: i === current ? '#fff' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 9, color: SLIDE_TYPE_BADGE[s.type]?.color || '#9299b5', fontWeight: 700, letterSpacing: '0.1em' }}>
                      {SLIDE_TYPE_BADGE[s.type]?.label}
                    </div>
                  </div>
                  {i === current && <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ SHARE PANEL (internal) ═══════════════════════════════════════════ */}
      {showSharePanel && !publicMode && token && (
        <div style={{
          position: 'absolute', bottom: showFilmstrip ? 186 : 100, right: 16, zIndex: 50,
          width: 320, background: 'rgba(8,10,16,0.96)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18,
          padding: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          animation: 'pvSlideUp 0.3s ease both',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Share with Client</span>
            <button onClick={() => setShowSharePanel(false)} style={iconBtnSt}><X size={13} /></button>
          </div>

          {/* Link row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '8px 10px', marginBottom: 14,
          }}>
            <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/presentation/${token}` : ''}
            </span>
            <button
              onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8, border: 'none',
                background: linkCopied ? '#22c07a' : accent, color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
            >
              {linkCopied ? <Check size={11} /> : <Copy size={11} />}
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Speed */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 8 }}>SLIDE SPEED</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSpeed(opt.value)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                    background: speed === opt.value ? accent : 'rgba(255,255,255,0.06)',
                    color: speed === opt.value ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.6 }}>
            Client can review, rate the design, and leave feedback directly from this link.
          </p>
        </div>
      )}

      {/* ══ OUTRO (public auto-shows after last slide) ══════════════════════ */}
      {showOutro && publicMode && !decisionMade && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
          animation: 'pvFadeIn 0.6s ease both',
        }}>
          {showFeedbackForm ? (
            <div style={{ maxWidth: 460, width: '100%', padding: '0 24px', animation: 'pvSlideUp 0.3s ease both' }}>
              <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8 }}>Request Changes</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
                Tell us exactly what to change and our designer will update it.
              </p>
              <textarea
                autoFocus
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Describe what you'd like changed..."
                rows={5}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, padding: '14px 16px', fontSize: 14, color: '#fff',
                  outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => setShowFeedbackForm(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Back</button>
                <button
                  onClick={() => handleDecision('request_changes', feedbackText)}
                  disabled={!feedbackText.trim()}
                  style={{
                    flex: 2, padding: '13px 0', borderRadius: 12, border: 'none', cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                    background: feedbackText.trim() ? '#f59e0b' : 'rgba(245,158,11,0.15)',
                    color: feedbackText.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                    fontSize: 14, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
                  }}
                >
                  Send Feedback
                </button>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 460, width: '100%', padding: '0 24px', textAlign: 'center', animation: 'pvSlideUp 0.4s ease both' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Your Reaction</div>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8 }}>
                What do you think?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
                Rate this design and let us know if you&apos;re ready to move forward.
              </p>

              {/* Star rating */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setStarHover(n)}
                    onMouseLeave={() => setStarHover(0)}
                    onClick={() => handleStarRating(n)}
                    style={{
                      width: 52, height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: (starHover >= n || starRating >= n) ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      transform: starHover >= n ? 'scale(1.12)' : 'scale(1)',
                    }}
                    title={['Needs work', 'Not quite', 'Getting closer', 'Love it!', 'Perfect!'][n - 1]}
                  >
                    <Star size={24} fill={(starHover >= n || starRating >= n) ? '#f59e0b' : 'none'} color={(starHover >= n || starRating >= n) ? '#f59e0b' : 'rgba(255,255,255,0.25)'} />
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => handleDecision('love_it')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '14px 28px', borderRadius: 50, border: 'none',
                    background: 'linear-gradient(135deg, #22c07a, #16a34a)',
                    color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    boxShadow: '0 6px 24px rgba(34,192,122,0.35)',
                  }}
                >
                  <Heart size={16} fill="#fff" />
                  I Love It — Let&apos;s Do This!
                </button>
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '14px 24px', borderRadius: 50,
                    background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={15} />
                  Request Changes
                </button>
              </div>

              {/* Back to slideshow */}
              <button
                onClick={() => { setShowOutro(false); setIsPlaying(false) }}
                style={{ marginTop: 24, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer' }}
              >
                ← Review again
              </button>

              {publicMode && (
                <div style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
                  Powered by {branding.companyName || 'USA Wrap Co'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ PUBLIC CTA (visible during slideshow) ════════════════════════════ */}
      {publicMode && !decisionMade && !showOutro && (
        <div style={{
          position: 'absolute', bottom: showFilmstrip ? 186 : 110, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 10, alignItems: 'center', zIndex: 35,
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}>
          <button
            onClick={() => handleDecision('love_it')}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 50, border: 'none',
              background: 'linear-gradient(135deg, #22c07a, #16a34a)',
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif',
              boxShadow: '0 4px 16px rgba(34,192,122,0.4)',
            }}
          >
            <Heart size={14} fill="#fff" />
            I Love It!
          </button>
          <button
            onClick={() => setShowFeedbackForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 50,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <MessageSquare size={13} />
            Changes
          </button>
        </div>
      )}

      {/* Floating feedback form (public, during slideshow) */}
      {showFeedbackForm && !showOutro && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          animation: 'pvFadeIn 0.25s ease both',
        }}>
          <div style={{ maxWidth: 460, width: '100%', animation: 'pvSlideUp 0.3s ease both' }}>
            <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8 }}>Request Changes</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>What would you like us to change?</p>
            <textarea
              autoFocus
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="e.g. Make the logo bigger, change to blue, add website URL..."
              rows={5}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                padding: '14px 16px', fontSize: 14, color: '#fff',
                outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowFeedbackForm(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
              <button
                onClick={() => handleDecision('request_changes', feedbackText)}
                disabled={!feedbackText.trim()}
                style={{
                  flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
                  background: feedbackText.trim() ? '#f59e0b' : 'rgba(245,158,11,0.15)',
                  color: feedbackText.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                  cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 14, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
                }}
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FILMSTRIP ═══════════════════════════════════════════════════════ */}
      {showFilmstrip && slides.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 76, left: 0, right: 0, zIndex: 25,
          opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease',
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}>
          <div
            ref={filmstripRef}
            style={{
              display: 'flex', gap: 6, padding: '8px 20px',
              overflowX: 'auto', scrollbarWidth: 'none',
            }}
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                data-slide={i}
                onClick={() => goTo(i, false)}
                style={{
                  flexShrink: 0, width: 88, height: 54, borderRadius: 8, overflow: 'hidden',
                  border: `2px solid ${i === current ? accent : 'rgba(255,255,255,0.15)'}`,
                  background: '#111', cursor: 'pointer', padding: 0,
                  opacity: i === current ? 1 : 0.55,
                  transition: 'all 0.25s ease',
                  boxShadow: i === current ? `0 0 0 1px ${accent}50, 0 4px 16px rgba(0,0,0,0.5)` : 'none',
                  transform: i === current ? 'scale(1.05)' : 'scale(1)',
                }}
                title={s.label}
              >
                <img
                  src={s.url}
                  alt={s.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ BOTTOM CONTROLS ══════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: showDetails ? 284 : 0,
        zIndex: 30,
        opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease',
        pointerEvents: controlsVisible ? 'auto' : 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        paddingBottom: 12,
      }}>
        {/* Overall progress line */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
          <div style={{ height: '100%', background: accent, width: `${((current + 1) / Math.max(slides.length, 1)) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 4px' }}>
          {/* Play/Pause with circular progress ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setIsPlaying(v => !v)}
              style={{ ...ctrlBtnSt, width: 38, height: 38, position: 'relative', zIndex: 1 }}
            >
              {isPlaying ? <Pause size={15} fill="#fff" /> : <Play size={15} fill="#fff" />}
            </button>
            {isPlaying && (
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={38} height={38}>
                <circle cx={19} cy={19} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
                <circle cx={19} cy={19} r={R} fill="none" stroke={accent} strokeWidth={2}
                  strokeDasharray={CIRC} strokeDashoffset={dash}
                  transform="rotate(-90 19 19)" strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.08s linear' }}
                />
              </svg>
            )}
          </div>

          {/* Prev / Next */}
          <button onClick={goPrev} style={ctrlBtnSt} title="Previous"><ChevronLeft size={17} /></button>
          <button onClick={goNext} style={ctrlBtnSt} title="Next"><ChevronRight size={17} /></button>

          {/* Angle pills */}
          <div style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i, false)}
                style={{
                  padding: '4px 11px', borderRadius: 20, flexShrink: 0,
                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${i === current ? accent : 'rgba(255,255,255,0.15)'}`,
                  background: i === current ? `${accent}25` : 'rgba(0,0,0,0.45)',
                  color: i === current ? accent : 'rgba(255,255,255,0.45)',
                  backdropFilter: 'blur(4px)', transition: 'all 0.2s ease',
                  letterSpacing: '0.02em',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
            {/* Speed pills */}
            <div style={{ display: 'flex', gap: 2 }}>
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSpeed(opt.value)}
                  style={{
                    padding: '3px 7px', borderRadius: 6, fontSize: 9, fontWeight: 800, cursor: 'pointer',
                    border: 'none',
                    background: speed === opt.value ? accent : 'rgba(255,255,255,0.08)',
                    color: speed === opt.value ? '#fff' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: 2,
                  }}
                  title={`${opt.value} seconds per slide`}
                >
                  <Clock size={8} />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Before/After */}
            {hasBA && (
              <button
                onClick={() => setShowBeforeAfter(v => !v)}
                style={{
                  ...ctrlBtnSt,
                  background: showBeforeAfter ? `${accent}25` : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${showBeforeAfter ? accent : 'transparent'}`,
                  color: showBeforeAfter ? accent : '#fff',
                }}
                title="Before / After compare"
              >
                <RotateCcw size={13} />
              </button>
            )}

            {/* Filmstrip toggle */}
            <button
              onClick={() => setShowFilmstrip(v => !v)}
              style={{
                ...ctrlBtnSt,
                background: showFilmstrip ? `${accent}25` : 'rgba(255,255,255,0.1)',
                border: `1px solid ${showFilmstrip ? accent : 'transparent'}`,
                color: showFilmstrip ? accent : '#fff',
              }}
              title="Filmstrip"
            >
              <Layers size={13} />
            </button>

            {/* Details */}
            <button
              onClick={() => setShowDetails(v => !v)}
              style={{ ...ctrlBtnSt, background: showDetails ? `${accent}25` : 'rgba(255,255,255,0.1)', border: `1px solid ${showDetails ? accent : 'transparent'}`, color: showDetails ? accent : '#fff' }}
              title="Design details"
            >
              <Info size={13} />
            </button>

            {/* Share (internal) */}
            {!publicMode && token && (
              <button
                onClick={() => setShowSharePanel(v => !v)}
                style={{ ...ctrlBtnSt, background: showSharePanel ? `${accent}25` : 'rgba(255,255,255,0.1)', border: `1px solid ${showSharePanel ? accent : 'transparent'}`, color: showSharePanel ? accent : '#fff' }}
                title="Share with client"
              >
                <Share2 size={13} />
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} style={ctrlBtnSt} title="Fullscreen (F)">
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
            </button>
          </div>
        </div>

        {/* Slide dots (compact, under pills) */}
        {slides.length > 1 && slides.length <= 16 && !showFilmstrip && (
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', paddingBottom: 4 }}>
            {slides.map((_, i) => (
              <div
                key={i}
                onClick={() => goTo(i, false)}
                style={{ width: i === current ? 18 : 5, height: 5, borderRadius: 3, background: i === current ? accent : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AmbientLayer({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover',
        filter: 'blur(48px) brightness(0.22) saturate(1.6)',
        transform: 'scale(1.12)',
        pointerEvents: 'none',
      }}
    />
  )
}

function GrainOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: '-50%', zIndex: 15, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/></filter><rect width='256' height='256' filter='url(%23n)' opacity='1'/></svg>")`,
        backgroundRepeat: 'repeat',
        opacity: 0.028,
        mixBlendMode: 'overlay',
        animation: 'pvGrain 0.4s steps(1) infinite',
      }}
    />
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textAlign: 'right', maxWidth: 160 }}>{value}</span>
    </div>
  )
}

function baLabelStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    [side]: 16, bottom: 96,
    padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900,
    background: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(4px)',
    letterSpacing: '0.12em', pointerEvents: 'none',
  }
}

const ctrlBtnSt: CSSProperties = {
  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s ease',
}

const topBtnSt: CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const iconBtnSt: CSSProperties = {
  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
  background: 'rgba(255,255,255,0.06)', border: 'none',
  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
