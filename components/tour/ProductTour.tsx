'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft, Zap, SkipForward } from 'lucide-react'

const TOUR_KEY = 'usawrapco_tour_v1'
const VISIT_KEY = 'usawrapco_last_visit'

interface TourStep {
  id: string
  title: string
  description: string
  target: string | null
  position: 'center' | 'bottom' | 'bottom-right' | 'top-left' | 'bottom-left'
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to USA WRAP CO',
    description: 'Your AI-powered vehicle wrap shop management platform. Let us show you around — it only takes 60 seconds\!',
    target: null,
    position: 'center',
  },
  {
    id: 'new-button',
    title: 'Quick Create',
    description: 'Instantly create estimates, jobs, customers, and tasks from anywhere in the app.',
    target: '[data-tour="new-button"]',
    position: 'bottom-right',
  },
  {
    id: 'nav-jobs',
    title: 'Jobs Pipeline',
    description: 'Every job flows through: Sales to Design to Production to Install to QC to Close. Nothing falls through the cracks.',
    target: '[data-tour="nav-jobs"]',
    position: 'bottom',
  },
  {
    id: 'nav-inbox',
    title: 'Unified Inbox',
    description: 'All customer SMS and email in one place. AI auto-drafts replies based on job history.',
    target: '[data-tour="nav-inbox"]',
    position: 'bottom',
  },
  {
    id: 'nav-tasks',
    title: 'Smart Tasks',
    description: 'Tasks auto-create when jobs advance stages. Assign by role — installer, designer, sales agent.',
    target: '[data-tour="nav-tasks"]',
    position: 'bottom',
  },
  {
    id: 'transactions',
    title: 'Financial Workflow',
    description: 'Estimates convert to Sales Orders, then Invoices. Full financial lifecycle tracked end-to-end with PDF export and email delivery.',
    target: '[data-tour="transactions"]',
    position: 'bottom',
  },
  {
    id: 'genie-fab',
    title: 'AI Genie — Your Autonomous Assistant',
    description: 'Ask Genie to write emails, price wraps, summarize jobs, or run your entire sales pipeline hands-free.',
    target: '[data-tour="genie-fab"]',
    position: 'top-left',
  },
  {
    id: 'done',
    title: 'You are all set\!',
    description: 'Restart this tour anytime with the ? button in the top nav. Now go close some deals\!',
    target: null,
    position: 'center',
  },
]

function useRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!selector) { setRect(null); return }
    const update = () => {
      const el = document.querySelector(selector)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update) }
  }, [selector])
  return rect
}

interface Props {
  userName: string
  open: boolean
  onClose: () => void
}

export function ProductTour({ userName, open, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [narration, setNarration] = useState<string | null>(null)
  const [narrating, setNarrating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const currentStep = STEPS[step]
  const rect = useRect(open ? currentStep.target : null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    setNarration(null)
    setNarrating(true)
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    fetch('/api/tour/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: currentStep.title, description: currentStep.description, userName }),
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then(d => { if (!ctrl.signal.aborted) { setNarration(d.narration); setNarrating(false) } })
      .catch(() => { if (!ctrl.signal.aborted) { setNarration(currentStep.description); setNarrating(false) } })

    return () => ctrl.abort()
  }, [open, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else { completeTour(); onClose() }
  }, [step, onClose])

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  const skip = useCallback(() => {
    completeTour()
    onClose()
  }, [onClose])

  function completeTour() {
    localStorage.setItem(TOUR_KEY, 'completed')
    localStorage.setItem(VISIT_KEY, new Date().toISOString())
  }

  if (!mounted || !open) return null

  const pad = 12
  const spotlight = rect ? {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  } : null

  function tooltipStyle(): React.CSSProperties {
    const base: React.CSSProperties = {
      position: 'fixed', zIndex: 10002,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '20px 22px',
      width: 340,
      boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
    }

    if (!rect || currentStep.position === 'center') {
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const s = spotlight!
    if (currentStep.position === 'bottom' || currentStep.position === 'bottom-right') {
      return {
        ...base,
        top: s.top + s.height + 16,
        left: currentStep.position === 'bottom-right'
          ? Math.min(s.left, window.innerWidth - 360)
          : Math.max(8, s.left + s.width / 2 - 170),
      }
    }
    if (currentStep.position === 'top-left') {
      return { ...base, bottom: window.innerHeight - s.top + 16, left: Math.max(8, s.left) }
    }
    return { ...base, top: s.top + s.height + 16, left: Math.max(8, s.left) }
  }

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.75)',
          transition: 'opacity 0.3s',
        }}
        onClick={skip}
      />

      {spotlight && (
        <div
          style={{
            position: 'fixed',
            zIndex: 10001,
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
            border: '2px solid var(--accent)',
            pointerEvents: 'none',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      <div style={tooltipStyle()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(79,127,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Product Tour · {step + 1}/{STEPS.length}
            </span>
          </div>
          <button
            onClick={skip}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, var(--accent), var(--cyan))',
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 22, fontWeight: 900, color: 'var(--text1)', marginBottom: 10,
        }}>
          {currentStep.title}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20, minHeight: 52 }}>
          {narrating ? (
            <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
              AI narrating...
            </span>
          ) : (narration || currentStep.description)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={skip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <SkipForward size={11} /> Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '7px 18px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {step === STEPS.length - 1 ? "Lets go!" : 'Next'} <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// WhatsNew Modal
interface WhatsNewProps {
  commits: Array<{ subject: string; category: string; date: string }>
  onClose: () => void
}

const CAT_COLORS: Record<string, string> = {
  ai: '#8b5cf6', finance: '#22c07a', comms: '#22d3ee',
  sales: '#4f7fff', workflow: '#f59e0b', production: '#f25a5a',
  feature: '#4f7fff', fix: '#f25a5a', ui: '#f59e0b',
}

export function WhatsNewModal({ commits, onClose }: WhatsNewProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 28, width: 480, maxHeight: '70vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 900, color: 'var(--text1)' }}>
              Whats New
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {commits.length} update{commits.length !== 1 ? 's' : ''} since your last visit
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {commits.slice(0, 12).map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: CAT_COLORS[c.category] || '#5a6080',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>{c.subject}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, textTransform: 'capitalize' }}>
                  {c.category} · {c.date}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20, padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Got it, lets go!
        </button>
      </div>
    </div>,
    document.body
  )
}

// Hook for tour state management
export function useTour() {
  const [tourOpen, setTourOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [newCommits, setNewCommits] = useState<any[]>([])

  useEffect(() => {
    const tourDone = localStorage.getItem(TOUR_KEY)
    const lastVisit = localStorage.getItem(VISIT_KEY)
    const now = new Date().toISOString()

    if (!tourDone) {
      setTimeout(() => setTourOpen(true), 800)
      localStorage.setItem(VISIT_KEY, now)
      return
    }

    if (lastVisit) {
      fetch('/api/changelog')
        .then(r => r.json())
        .then(d => {
          const fresh = (d.commits || []).filter((c: any) => c.date > lastVisit.substring(0, 10))
          if (fresh.length > 0) {
            setNewCommits(fresh)
            setWhatsNewOpen(true)
          }
        })
        .catch((error) => { console.error(error); })
    }
    localStorage.setItem(VISIT_KEY, now)
  }, [])

  return {
    tourOpen,
    whatsNewOpen,
    newCommits,
    startTour: () => setTourOpen(true),
    closeTour: () => setTourOpen(false),
    closeWhatsNew: () => setWhatsNewOpen(false),
  }
}
