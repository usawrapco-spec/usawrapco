'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  ArrowRight,
  Wand2,
  CheckSquare,
  Inbox,
  Rocket,
} from 'lucide-react'

// ─── Colors ─────────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0f14',
  surface: '#161920',
  surface2: '#1a1d27',
  border: '#1e2330',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
  overlay: 'rgba(0,0,0,0.7)',
}

// ─── Types ──────────────────────────────────────────────────────────────────────
interface TourStep {
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  icon: React.ReactNode
}

interface TourConfig {
  steps: TourStep[]
}

interface TutorialOverlayProps {
  tourName: string
  onComplete: () => void
}

// ─── Tour Data ──────────────────────────────────────────────────────────────────
const TOURS: Record<string, TourConfig> = {
  'getting-started': {
    steps: [
      {
        title: 'Welcome to Your Dashboard',
        description:
          'This is your command center for everything. See active jobs, revenue metrics, upcoming installs, and team activity at a glance.',
        position: 'bottom',
        icon: <LayoutDashboard size={20} />,
      },
      {
        title: 'Sales Pipeline',
        description:
          'The Sales Pipeline shows all your deals flowing through stages. Drag and drop to move jobs, or click to view details.',
        position: 'bottom',
        icon: <FolderKanban size={20} />,
      },
      {
        title: 'Create a New Estimate',
        description:
          'Hit the + button to start quoting a new job. Add line items, calculate GPM, and send to your customer for approval.',
        position: 'left',
        icon: <PlusCircle size={20} />,
      },
      {
        title: 'Job Lifecycle Stages',
        description:
          'Each job moves through stages: Sales, Production, Install, QC, and Close. Sign-off gates ensure nothing slips through the cracks.',
        position: 'bottom',
        icon: <ArrowRight size={20} />,
      },
      {
        title: 'AI Genie Bar',
        description:
          'The AI Genie bar gives you intelligent suggestions and quick actions. Ask it anything about your business data.',
        position: 'top',
        icon: <Wand2 size={20} />,
      },
      {
        title: 'Your Tasks',
        description:
          'Check your Tasks to see what needs your attention today. Auto-generated tasks keep your team aligned and on schedule.',
        position: 'right',
        icon: <CheckSquare size={20} />,
      },
      {
        title: 'Inbox',
        description:
          'The Inbox keeps all customer communication in one place. Reply to messages, review proofs, and track approvals.',
        position: 'right',
        icon: <Inbox size={20} />,
      },
      {
        title: 'You Are All Set!',
        description:
          'Click any page in the sidebar to start exploring. You can always restart this tour from the help menu.',
        position: 'bottom',
        icon: <Rocket size={20} />,
      },
    ],
  },
  'sales-tour': {
    steps: [
      {
        title: 'Estimates Overview',
        description:
          'All your estimates live here. Filter by status, search by customer, and track conversion rates.',
        position: 'bottom',
        icon: <FolderKanban size={20} />,
      },
      {
        title: 'Create an Estimate',
        description:
          'Add line items with descriptions, quantities, and prices. The GPM calculator shows your margin in real time.',
        position: 'bottom',
        icon: <PlusCircle size={20} />,
      },
      {
        title: 'Send for Approval',
        description:
          'Generate a unique link and email it to your customer. They can view, sign, upload assets, and pay their deposit.',
        position: 'right',
        icon: <ArrowRight size={20} />,
      },
      {
        title: 'Convert to Sales Order',
        description:
          'Once accepted, convert the estimate to a Sales Order with one click. Jobs are auto-created from each line item.',
        position: 'bottom',
        icon: <CheckSquare size={20} />,
      },
    ],
  },
  'production-tour': {
    steps: [
      {
        title: 'Production Queue',
        description:
          'See all jobs waiting for print, in production, and ready for install. Prioritize by due date and material availability.',
        position: 'bottom',
        icon: <FolderKanban size={20} />,
      },
      {
        title: 'Material Tracking',
        description:
          'Track vinyl inventory, log material usage per job, and get alerts when stock is running low.',
        position: 'right',
        icon: <CheckSquare size={20} />,
      },
      {
        title: 'Print Schedule',
        description:
          'Assign jobs to printers, schedule print runs, and track output. Avoid bottlenecks with visual scheduling.',
        position: 'bottom',
        icon: <ArrowRight size={20} />,
      },
    ],
  },
  'install-tour': {
    steps: [
      {
        title: 'Install Calendar',
        description:
          'View all upcoming installs on the calendar. See installer availability, vehicle drop-off times, and estimated durations.',
        position: 'bottom',
        icon: <FolderKanban size={20} />,
      },
      {
        title: 'Install Timer',
        description:
          'Start a timer when installation begins. Track hours per job for accurate labor costing and installer pay.',
        position: 'right',
        icon: <CheckSquare size={20} />,
      },
      {
        title: 'Quality Checklist',
        description:
          'Complete the QC checklist before marking a job as installed. Ensure every wrap meets your quality standards.',
        position: 'bottom',
        icon: <ArrowRight size={20} />,
      },
    ],
  },
}

// ─── Tooltip Position Helpers ────────────────────────────────────────────────────

function getTooltipPositionStyles(
  position: 'top' | 'bottom' | 'left' | 'right',
  isMobile: boolean,
): React.CSSProperties {
  // On mobile, always render as a bottom sheet
  if (isMobile) {
    return {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: '16px 16px 0 0',
      maxWidth: '100%',
    }
  }

  // Desktop centered tooltip
  const base: React.CSSProperties = {
    position: 'fixed',
    maxWidth: 400,
    width: '90vw',
  }

  switch (position) {
    case 'top':
      return { ...base, top: '20%', left: '50%', transform: 'translateX(-50%)' }
    case 'bottom':
      return { ...base, top: '35%', left: '50%', transform: 'translateX(-50%)' }
    case 'left':
      return { ...base, top: '30%', left: '15%' }
    case 'right':
      return { ...base, top: '30%', right: '15%' }
    default:
      return { ...base, top: '35%', left: '50%', transform: 'translateX(-50%)' }
  }
}

function getArrowStyles(
  position: 'top' | 'bottom' | 'left' | 'right',
  accentColor: string,
): React.CSSProperties | null {
  const size = 8
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  }

  switch (position) {
    case 'top':
      return {
        ...base,
        bottom: -size,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: `${size}px solid transparent`,
        borderRight: `${size}px solid transparent`,
        borderTop: `${size}px solid ${C.surface}`,
      }
    case 'bottom':
      return {
        ...base,
        top: -size,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: `${size}px solid transparent`,
        borderRight: `${size}px solid transparent`,
        borderBottom: `${size}px solid ${C.surface}`,
      }
    case 'left':
      return {
        ...base,
        right: -size,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: `${size}px solid transparent`,
        borderBottom: `${size}px solid transparent`,
        borderLeft: `${size}px solid ${C.surface}`,
      }
    case 'right':
      return {
        ...base,
        left: -size,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: `${size}px solid transparent`,
        borderBottom: `${size}px solid transparent`,
        borderRight: `${size}px solid ${C.surface}`,
      }
    default:
      return null
  }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function TutorialOverlay({ tourName, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const tour = TOURS[tourName]

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check localStorage for completed tours
  useEffect(() => {
    const storageKey = `tutorial_${tourName}_completed`
    const completed = localStorage.getItem(storageKey)
    if (completed === 'true') {
      setIsVisible(false)
    }
  }, [tourName])

  const markComplete = useCallback(() => {
    const storageKey = `tutorial_${tourName}_completed`
    localStorage.setItem(storageKey, 'true')
    setIsVisible(false)
    onComplete()
  }, [tourName, onComplete])

  const animateTransition = useCallback((callback: () => void) => {
    setIsAnimating(true)
    setTimeout(() => {
      callback()
      setIsAnimating(false)
    }, 200)
  }, [])

  const goNext = useCallback(() => {
    if (!tour) return
    if (currentStep < tour.steps.length - 1) {
      animateTransition(() => setCurrentStep((s) => s + 1))
    } else {
      markComplete()
    }
  }, [currentStep, tour, animateTransition, markComplete])

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      animateTransition(() => setCurrentStep((s) => s - 1))
    }
  }, [currentStep, animateTransition])

  const handleSkip = useCallback(() => {
    markComplete()
  }, [markComplete])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isVisible, goNext, goPrev, handleSkip])

  if (!isVisible || !tour) return null

  const step = tour.steps[currentStep]
  const isLast = currentStep === tour.steps.length - 1
  const totalSteps = tour.steps.length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}
    >
      {/* Dark overlay with backdrop blur */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: C.overlay,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.3s ease',
        }}
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <div
        style={{
          ...getTooltipPositionStyles(step.position, isMobile),
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: isMobile ? '16px 16px 0 0' : 12,
          padding: isMobile ? '24px 20px 32px' : '20px',
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`,
          zIndex: 10000,
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating
            ? isMobile
              ? 'translateY(20px)'
              : 'scale(0.95)'
            : isMobile
              ? 'translateY(0)'
              : 'scale(1)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Arrow (desktop only) */}
        {!isMobile && (() => {
          const arrowStyle = getArrowStyles(step.position, C.accent)
          return arrowStyle ? <div style={arrowStyle} /> : null
        })()}

        {/* Close button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: isMobile ? 16 : 12,
            right: isMobile ? 16 : 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.text3,
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget.style.color = C.text1) }}
          onMouseLeave={(e) => { (e.currentTarget.style.color = C.text3) }}
          aria-label="Close tutorial"
        >
          <X size={16} />
        </button>

        {/* Step icon + counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `${C.accent}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.accent,
              flexShrink: 0,
            }}
          >
            {step.icon}
          </div>
          <div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: C.accent,
                letterSpacing: '.04em',
              }}
            >
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '.05em',
            color: C.text1,
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
          }}
        >
          {step.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: C.text2,
            lineHeight: 1.6,
            margin: '0 0 20px 0',
          }}
        >
          {step.description}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentStep ? C.accent : i < currentStep ? `${C.accent}60` : C.border,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Skip */}
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: C.text3,
              padding: '6px 0',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget.style.color = C.text2) }}
            onMouseLeave={(e) => { (e.currentTarget.style.color = C.text3) }}
          >
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Previous */}
            {currentStep > 0 && (
              <button
                onClick={goPrev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  color: C.text2,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.accent + '60'
                  e.currentTarget.style.color = C.text1
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border
                  e.currentTarget.style.color = C.text2
                }}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={goNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 18px',
                borderRadius: 6,
                background: isLast ? C.green : C.accent,
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.opacity = '0.85') }}
              onMouseLeave={(e) => { (e.currentTarget.style.opacity = '1') }}
            >
              {isLast ? (
                <>
                  <Sparkles size={14} />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Help Button (for integration into layouts) ─────────────────────────────────

interface HelpButtonProps {
  onClick: () => void
}

export function TutorialHelpButton({ onClick }: HelpButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: hovered ? C.accent : C.surface,
        border: `1px solid ${hovered ? C.accent : C.border}`,
        color: hovered ? '#fff' : C.text2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        zIndex: 100,
      }}
      aria-label="Show available tours"
    >
      <HelpCircle size={20} />
    </button>
  )
}

// ─── Tour Picker (shows available tours when "?" is clicked) ────────────────────

interface TourPickerProps {
  onSelect: (tourName: string) => void
  onClose: () => void
}

export function TourPicker({ onSelect, onClose }: TourPickerProps) {
  const tourList = [
    { key: 'getting-started', title: 'Getting Started', desc: 'Overview of the entire platform', icon: <Rocket size={16} /> },
    { key: 'sales-tour', title: 'Sales Workflow', desc: 'Estimates, orders, and conversions', icon: <FolderKanban size={16} /> },
    { key: 'production-tour', title: 'Production', desc: 'Print scheduling and materials', icon: <CheckSquare size={16} /> },
    { key: 'install-tour', title: 'Installation', desc: 'Install calendar and QC process', icon: <Wand2 size={16} /> },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 72,
        right: 20,
        width: 280,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '.05em',
            color: C.text1,
            textTransform: 'uppercase',
          }}
        >
          Available Tours
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.text3,
            padding: 2,
            display: 'flex',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Tour list */}
      <div style={{ padding: 6 }}>
        {tourList.map((t) => {
          const isCompleted = typeof window !== 'undefined' && localStorage.getItem(`tutorial_${t.key}_completed`) === 'true'

          return (
            <button
              key={t.key}
              onClick={() => {
                // Clear completion so tour can re-run
                localStorage.removeItem(`tutorial_${t.key}_completed`)
                onSelect(t.key)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 10px',
                borderRadius: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.background = C.surface2) }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'none') }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background: `${C.accent}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.accent,
                  flexShrink: 0,
                }}
              >
                {t.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{t.title}</span>
                  {isCompleted && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: C.green,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                      }}
                    >
                      Done
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.text3 }}>{t.desc}</div>
              </div>
              <ChevronRight size={14} style={{ color: C.text3, flexShrink: 0 }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
