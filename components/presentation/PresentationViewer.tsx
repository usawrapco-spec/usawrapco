'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties } from 'react'
import {
  Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize,
  X, Share2, Copy, Check, Heart, MessageSquare, Info,
  RotateCcw, Layers,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PresentationSlide {
  id: string
  url: string
  label: string            // "Front 3/4", "Driver Side", etc.
  type: 'wrapped' | 'original' | 'mockup' | 'canvas'
  caption?: string
  beforeUrl?: string       // original vehicle photo for before/after
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

// ─── Ken Burns animation variants ────────────────────────────────────────────
const KB_ANIMS = [
  { name: 'kb1', from: 'scale(1.0) translate(0%,0%)',    to: 'scale(1.09) translate(-1.5%,-1%)' },
  { name: 'kb2', from: 'scale(1.0) translate(0%,0%)',    to: 'scale(1.09) translate(1.5%,-1%)' },
  { name: 'kb3', from: 'scale(1.0) translate(0%,0%)',    to: 'scale(1.09) translate(-1%,1.5%)' },
  { name: 'kb4', from: 'scale(1.05) translate(1%,1%)',   to: 'scale(1.0) translate(-1%,-1%)' },
  { name: 'kb5', from: 'scale(1.05) translate(-1%,-1%)', to: 'scale(1.0) translate(1%,1%)' },
]

export default function PresentationViewer({
  slides,
  clientName,
  title,
  branding = {},
  timerSeconds = 4,
  onClose,
  publicMode = false,
  token,
  sessionId,
  onDecision,
}: Props) {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [animVariant, setAnimVariant] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [timer, setTimer] = useState(timerSeconds)
  const [showShareModal, setShowShareModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [decisionMade, setDecisionMade] = useState<'love_it' | 'request_changes' | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [slidesSeen, setSlidesSeen] = useState<string[]>([])
  const [showIntro, setShowIntro] = useState(true)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  const slide = slides[current]
  const hasBeforeAfter = !!(slide?.beforeUrl)
  const accent = branding.accentColor || '#4f7fff'

  // ── Inject keyframe CSS ──────────────────────────────────────────────────
  useEffect(() => {
    const id = 'presentation-keyframes'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.innerHTML = KB_ANIMS.map(({ name, from, to }) => `
      @keyframes ${name} {
        from { transform: ${from}; }
        to   { transform: ${to}; }
      }
    `).join('\n') + `
      @keyframes presenterFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes presenterSlideUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes presenterPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.5; }
      }
      @keyframes introReveal {
        0%   { opacity: 0; transform: translateY(40px) scale(0.96); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  // ── Track viewed slides ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slide) return
    setSlidesSeen(prev => prev.includes(slide.id) ? prev : [...prev, slide.id])
  }, [slide])

  // ── Auto-hide controls ───────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHideTimer])

  // ── Slide timer / auto-play ──────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!slides.length) return
    setFadeOut(true)
    setTimeout(() => {
      setCurrent(c => (c + 1) % slides.length)
      setAnimVariant(v => (v + 1) % KB_ANIMS.length)
      setImgLoaded(false)
      setFadeOut(false)
      setTimer(timerSeconds)
    }, 400)
  }, [slides.length, timerSeconds])

  const goPrev = useCallback(() => {
    if (!slides.length) return
    setFadeOut(true)
    setTimeout(() => {
      setCurrent(c => (c - 1 + slides.length) % slides.length)
      setAnimVariant(v => (v + 1) % KB_ANIMS.length)
      setImgLoaded(false)
      setFadeOut(false)
      setTimer(timerSeconds)
    }, 400)
  }, [slides.length, timerSeconds])

  useEffect(() => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    if (!isPlaying || showIntro) return
    setTimer(timerSeconds)
    tickRef.current = setInterval(() => {
      setTimer(t => t > 0 ? t - 0.1 : 0)
    }, 100)
    slideTimerRef.current = setInterval(goNext, timerSeconds * 1000)
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [isPlaying, timerSeconds, goNext, showIntro])

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') { if (onClose) onClose() }
      if (e.key === 'f') toggleFullscreen()
      if (e.key === 'p') setIsPlaying(v => !v)
      resetHideTimer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, onClose, resetHideTimer])

  // ── Fullscreen API ───────────────────────────────────────────────────────
  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── Touch / swipe ────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    resetHideTimer()
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) goNext()
    else if (dx > 50) goPrev()
    resetHideTimer()
  }

  // ── Before/After slider drag ─────────────────────────────────────────────
  const handleSliderMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingSlider || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const pos = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    setSliderPos(pos)
  }, [isDraggingSlider])

  useEffect(() => {
    const up = () => setIsDraggingSlider(false)
    window.addEventListener('mousemove', handleSliderMove)
    window.addEventListener('touchmove', handleSliderMove)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', handleSliderMove)
      window.removeEventListener('touchmove', handleSliderMove)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [handleSliderMove])

  // ── Share link ───────────────────────────────────────────────────────────
  const copyShareLink = () => {
    const url = `${window.location.origin}/presentation/${token}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ── Decision (public mode) ───────────────────────────────────────────────
  const handleDecision = async (d: 'love_it' | 'request_changes', fb?: string) => {
    setDecisionMade(d)
    if (onDecision) onDecision(d, fb)
    setShowDecisionModal(false)
    setShowFeedbackForm(false)
  }

  // ── Intro screen ─────────────────────────────────────────────────────────
  if (showIntro) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          cursor: 'pointer',
        }}
        onClick={() => setShowIntro(false)}
      >
        {/* Cinematic vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          textAlign: 'center', padding: '0 40px', maxWidth: 600,
          animation: 'introReveal 1s ease forwards',
        }}>
          {/* Company branding */}
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt="Logo"
              style={{ height: 48, objectFit: 'contain', marginBottom: 32, opacity: 0.9 }}
            />
          )}
          {!branding.logoUrl && (
            <div style={{
              fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 32, fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {branding.companyName || 'USA WRAP CO'}
            </div>
          )}

          <div style={{
            fontSize: 11, fontWeight: 700, color: accent,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Prepared for
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 72px)',
            fontWeight: 900,
            color: '#fff',
            fontFamily: 'Barlow Condensed, sans-serif',
            lineHeight: 1.1,
            margin: '0 0 24px',
          }}>
            {clientName || title || 'Vehicle Wrap Presentation'}
          </h1>

          {branding.tagline && (
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 40, lineHeight: 1.6 }}>
              {branding.tagline}
            </p>
          )}

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 50,
            border: `1px solid rgba(255,255,255,0.2)`,
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            animation: 'presenterPulse 2s ease infinite',
          }}>
            <Play size={14} fill="currentColor" />
            Tap anywhere to begin
          </div>
        </div>
      </div>
    )
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (decisionMade && publicMode) {
    return (
      <div ref={containerRef} style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', padding: 40,
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 480,
          animation: 'introReveal 0.8s ease forwards',
        }}>
          {decisionMade === 'love_it' ? (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(34,192,122,0.15)', border: '2px solid #22c07a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <Heart size={36} fill="#22c07a" color="#22c07a" />
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12 }}>
                Let&apos;s Do This!
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Your team has been notified. We&apos;ll be in touch shortly to move forward with your project.
              </p>
              {branding.contactInfo && (
                <p style={{ marginTop: 24, fontSize: 13, color: accent }}>
                  {branding.contactInfo}
                </p>
              )}
            </>
          ) : (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(245,158,11,0.15)', border: '2px solid #f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <MessageSquare size={36} color="#f59e0b" />
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12 }}>
                Feedback Sent!
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Your feedback has been received. Our designer will review and reach out with updates.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const kbAnim = KB_ANIMS[animVariant % KB_ANIMS.length]

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000', overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── Main image with Ken Burns ──────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}>
        {slide && (
          <>
            {/* Before layer (always visible) */}
            {showBeforeAfter && slide.beforeUrl ? (
              <img
                src={slide.beforeUrl}
                alt="Original"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : null}

            {/* Main / After image */}
            <div style={{
              position: 'absolute', inset: 0,
              clipPath: showBeforeAfter && slide.beforeUrl
                ? `inset(0 ${100 - sliderPos}% 0 0)`
                : undefined,
            }}>
              <img
                key={`${current}-${slide.url}`}
                src={slide.url}
                alt={slide.label}
                onLoad={() => setImgLoaded(true)}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  animation: imgLoaded && isPlaying
                    ? `${kbAnim.name} ${timerSeconds}s ease-in-out forwards`
                    : 'none',
                  transformOrigin: 'center center',
                  willChange: 'transform',
                  opacity: imgLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}
              />
            </div>

            {/* Before/After divider */}
            {showBeforeAfter && slide.beforeUrl && (
              <div
                ref={sliderRef}
                style={{ position: 'absolute', inset: 0 }}
              >
                {/* Divider line */}
                <div
                  onMouseDown={() => setIsDraggingSlider(true)}
                  onTouchStart={() => setIsDraggingSlider(true)}
                  style={{
                    position: 'absolute',
                    left: `${sliderPos}%`,
                    top: 0, bottom: 0,
                    width: 3,
                    background: '#fff',
                    boxShadow: '0 0 12px rgba(0,0,0,0.8)',
                    cursor: 'col-resize',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                  }}
                >
                  {/* Handle */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'col-resize',
                  }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <div style={{ width: 2, height: 14, background: '#555', borderRadius: 2 }} />
                      <div style={{ width: 2, height: 14, background: '#555', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div style={{
                  position: 'absolute', left: 16, bottom: 80,
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(4px)',
                }}>BEFORE</div>
                <div style={{
                  position: 'absolute', right: 16, bottom: 80,
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(4px)',
                }}>AFTER</div>
              </div>
            )}
          </>
        )}

        {/* No images placeholder */}
        {!slide && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16,
          }}>
            <Layers size={64} color="rgba(255,255,255,0.1)" />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>No images in this presentation</p>
          </div>
        )}
      </div>

      {/* ── Vignette overlay ──────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)',
      }} />

      {/* ── Top branding bar ──────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        opacity: controlsVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: controlsVisible ? 'auto' : 'none',
      }}>
        {/* Logo / company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" style={{ height: 28, objectFit: 'contain' }} />
          ) : (
            <span style={{
              fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {branding.companyName || 'USA WRAP CO'}
            </span>
          )}
        </div>

        {/* Slide label */}
        {slide && (
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            {slide.label}
          </div>
        )}

        {/* Close (internal mode) */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
        {!onClose && <div style={{ width: 36 }} />}
      </div>

      {/* ── Slide caption ─────────────────────────────────────────────── */}
      {slide?.caption && (
        <div style={{
          position: 'absolute',
          bottom: 120, left: '50%', transform: 'translateX(-50%)',
          maxWidth: 600, textAlign: 'center',
          fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)',
          fontFamily: 'Georgia, serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}>
          &ldquo;{slide.caption}&rdquo;
        </div>
      )}

      {/* ── Design details panel ──────────────────────────────────────── */}
      {showDetails && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 280,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          padding: 24, overflowY: 'auto',
          animation: 'presenterSlideUp 0.3s ease forwards',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>
              DESIGN DETAILS
            </h3>
            <button onClick={() => setShowDetails(false)} style={iconBtnStyle}>
              <X size={14} />
            </button>
          </div>

          {clientName && (
            <DetailRow label="Client" value={clientName} />
          )}
          {title && (
            <DetailRow label="Project" value={title} />
          )}
          <DetailRow label="Total Slides" value={`${slides.length} views`} />
          <DetailRow label="Wrapped Views" value={`${slides.filter(s => s.type === 'wrapped' || s.type === 'canvas').length}`} />
          {slides.some(s => s.type === 'original') && (
            <DetailRow label="Original Photos" value={`${slides.filter(s => s.type === 'original').length}`} />
          )}

          <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 8 }}>
              ANGLES
            </div>
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setFadeOut(true)
                  setTimeout(() => {
                    setCurrent(i)
                    setImgLoaded(false)
                    setFadeOut(false)
                    setTimer(timerSeconds)
                  }, 300)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 8px', borderRadius: 6, marginBottom: 2,
                  background: i === current ? `${accent}20` : 'transparent',
                  border: `1px solid ${i === current ? accent : 'transparent'}`,
                  color: i === current ? accent : 'rgba(255,255,255,0.5)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: i === current ? accent : 'rgba(255,255,255,0.2)',
                }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom control bar ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: showDetails ? 280 : 0,
        opacity: controlsVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: controlsVisible ? 'auto' : 'none',
      }}>
        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: accent,
            width: `${((current + 1) / Math.max(slides.length, 1)) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
          {isPlaying && (
            <div style={{
              position: 'absolute', top: 0, left: `${(current / Math.max(slides.length, 1)) * 100}%`,
              height: '100%', background: 'rgba(255,255,255,0.5)',
              width: `${(1 / Math.max(slides.length, 1)) * 100}%`,
              transformOrigin: 'left',
              animation: `none`,
              transition: `width ${timerSeconds}s linear`,
            }} />
          )}
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
        }}>
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(v => !v)}
            style={controlBtnStyle}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
          </button>

          {/* Prev */}
          <button onClick={goPrev} style={controlBtnStyle} title="Previous">
            <ChevronLeft size={18} />
          </button>

          {/* Next */}
          <button onClick={goNext} style={controlBtnStyle} title="Next">
            <ChevronRight size={18} />
          </button>

          {/* Angle pills */}
          <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setFadeOut(true)
                  setTimeout(() => {
                    setCurrent(i)
                    setImgLoaded(false)
                    setFadeOut(false)
                    setTimer(timerSeconds)
                  }, 300)
                }}
                style={{
                  padding: '4px 12px', borderRadius: 20, flexShrink: 0,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${i === current ? accent : 'rgba(255,255,255,0.2)'}`,
                  background: i === current ? `${accent}30` : 'rgba(0,0,0,0.4)',
                  color: i === current ? accent : 'rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.2s ease',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Right side controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {/* Before/After toggle */}
            {hasBeforeAfter && (
              <button
                onClick={() => setShowBeforeAfter(v => !v)}
                style={{
                  ...controlBtnStyle,
                  background: showBeforeAfter ? `${accent}30` : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${showBeforeAfter ? accent : 'transparent'}`,
                  color: showBeforeAfter ? accent : '#fff',
                }}
                title="Before/After"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {/* Details panel */}
            <button
              onClick={() => setShowDetails(v => !v)}
              style={{
                ...controlBtnStyle,
                background: showDetails ? `${accent}30` : 'rgba(255,255,255,0.1)',
                border: `1px solid ${showDetails ? accent : 'transparent'}`,
                color: showDetails ? accent : '#fff',
              }}
              title="Design Details"
            >
              <Info size={14} />
            </button>

            {/* Share (internal mode) */}
            {token && !publicMode && (
              <button
                onClick={() => setShowShareModal(v => !v)}
                style={controlBtnStyle}
                title="Share Link"
              >
                <Share2 size={14} />
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} style={controlBtnStyle} title="Fullscreen">
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>
        </div>

        {/* Slide dots */}
        {slides.length > 1 && slides.length <= 12 && (
          <div style={{
            position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6,
          }}>
            {slides.map((_, i) => (
              <div
                key={i}
                onClick={() => {
                  setFadeOut(true)
                  setTimeout(() => { setCurrent(i); setImgLoaded(false); setFadeOut(false) }, 300)
                }}
                style={{
                  width: i === current ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === current ? accent : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Share modal ───────────────────────────────────────────────── */}
      {showShareModal && token && (
        <div style={{
          position: 'absolute', bottom: 100, right: 20,
          width: 340, background: 'rgba(13,15,20,0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
          padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          animation: 'presenterSlideUp 0.3s ease forwards',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>Share Presentation</h4>
            <button onClick={() => setShowShareModal(false)} style={iconBtnStyle}><X size={14} /></button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
          }}>
            <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/presentation/${token}` : ''}
            </span>
            <button
              onClick={copyShareLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: linkCopied ? '#22c07a' : accent, color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {linkCopied ? <Check size={12} /> : <Copy size={12} />}
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
            Anyone with this link can view the presentation. Client can approve or request changes directly.
          </p>
        </div>
      )}

      {/* ── Public mode CTA bar ───────────────────────────────────────── */}
      {publicMode && !decisionMade && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: controlsVisible ? 'none' : 'none', // hidden until end
        }} />
      )}

      {/* Public floating CTA */}
      {publicMode && !decisionMade && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}>
          <button
            onClick={() => handleDecision('love_it')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 50, border: 'none',
              background: 'linear-gradient(135deg, #22c07a, #16a34a)',
              color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,192,122,0.4)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            <Heart size={16} fill="#fff" />
            I Love It — Let&apos;s Do This!
          </button>
          <button
            onClick={() => setShowFeedbackForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 50,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={16} />
            Request Changes
          </button>
        </div>
      )}

      {/* ── Feedback modal ────────────────────────────────────────────── */}
      {showFeedbackForm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#13151c', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 32, maxWidth: 480, width: '100%',
            animation: 'presenterSlideUp 0.3s ease forwards',
          }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8 }}>
              Request Changes
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
              Tell us what you&apos;d like changed and our designer will update the wrap for you.
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Describe the changes you'd like to see..."
              rows={5}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                padding: '12px 16px', fontSize: 14, color: '#fff',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setShowFeedbackForm(false)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision('request_changes', feedbackText)}
                disabled={!feedbackText.trim()}
                style={{
                  flex: 2, padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: feedbackText.trim() ? '#f59e0b' : 'rgba(245,158,11,0.2)',
                  color: feedbackText.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                  cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 14, fontWeight: 800,
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textAlign: 'right', maxWidth: 160 }}>{value}</span>
    </div>
  )
}

const controlBtnStyle: CSSProperties = {
  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s ease',
}

const iconBtnStyle: CSSProperties = {
  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
  background: 'rgba(255,255,255,0.08)', border: 'none',
  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
