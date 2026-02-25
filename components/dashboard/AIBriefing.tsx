'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import type { Project } from '@/types'

interface AIBriefingProps {
  orgId: string
  profileId: string
  projects?: Project[]
}

interface BriefingData {
  summary: string[]
  timestamp: string
}

function generateLocalBriefing(projects: Project[]): string[] {
  const parts: string[] = []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const dayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  parts.push(`Good ${today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}. Today is ${dayLabel}.`)

  // Today's installs
  const todayInstalls = projects.filter(p => {
    const d = p.install_date || (p.form_data as any)?.installDate
    return d && d.startsWith(todayStr) && p.status !== 'cancelled' && p.status !== 'closed'
  })
  if (todayInstalls.length > 0) {
    parts.push(`You have ${todayInstalls.length} install${todayInstalls.length > 1 ? 's' : ''} scheduled today${todayInstalls[0] ? ` — ${todayInstalls[0].title || todayInstalls[0].vehicle_desc || 'Untitled'}${todayInstalls.length > 1 ? ` + ${todayInstalls.length - 1} more` : ''}` : ''}.`)
  }

  // Weather alerts from mobile install jobs
  const weatherAlertJobs = projects.filter(p => {
    const alerts = (p as any).weather_alerts
    return (p as any).is_mobile_install && Array.isArray(alerts) && alerts.length > 0
  })
  if (weatherAlertJobs.length > 0) {
    parts.push(`Weather alert: ${weatherAlertJobs.length} upcoming mobile install${weatherAlertJobs.length > 1 ? 's have' : ' has'} bad weather forecasted. Review before confirming schedule.`)
  }

  // In-progress jobs
  const inProgress = projects.filter(p =>
    ['active', 'in_production', 'install_scheduled', 'installed', 'qc', 'closing'].includes(p.status)
  )
  if (inProgress.length > 0) {
    parts.push(`${inProgress.length} active job${inProgress.length > 1 ? 's' : ''} currently in the pipeline.`)
  }

  // Jobs needing attention (in same stage for a while - check via install stage)
  const installStage = projects.filter(p => p.pipe_stage === 'install')
  if (installStage.length > 0) {
    parts.push(`${installStage.length} job${installStage.length > 1 ? 's' : ''} in the Install stage — verify completion before advancing.`)
  }

  // Estimates open
  const openEstimates = projects.filter(p => p.status === 'estimate')
  if (openEstimates.length > 0) {
    parts.push(`${openEstimates.length} open estimate${openEstimates.length > 1 ? 's' : ''} awaiting customer decision.`)
  }

  if (parts.length <= 1) {
    parts.push('No urgent items today. All jobs are on track.')
  }

  return parts
}

export default function AIBriefing({ orgId, profileId, projects }: AIBriefingProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const key = `usawrap_briefing_v2_${today}_${profileId}`
    const cached = localStorage.getItem(key)

    if (cached) {
      try {
        setBriefing(JSON.parse(cached))
        return
      } catch {
        // fall through to regenerate
      }
    }

    generateBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  // Regenerate when projects change (e.g. weather alerts updated)
  useEffect(() => {
    if (projects && projects.length > 0) {
      generateBriefing()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects?.length])

  function generateBriefing() {
    const summary = generateLocalBriefing(projects || [])
    const data: BriefingData = { summary, timestamp: new Date().toISOString() }
    setBriefing(data)

    const today = new Date().toISOString().split('T')[0]
    const key = `usawrap_briefing_v2_${today}_${profileId}`
    try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
  }

  if (!briefing) return null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 15, fontWeight: 900, color: 'var(--text1)',
          }}>
            Today's Briefing
          </div>
          <div style={{
            fontSize: 9, color: 'var(--text3)',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '2px 6px',
            background: 'rgba(79,127,255,0.1)',
            borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Live
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => generateBriefing()}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
            title="Refresh briefing"
          >
            <RefreshCw size={11} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '4px 6px', background: 'transparent',
              border: 'none', borderRadius: 6, color: 'var(--text2)', cursor: 'pointer',
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {briefing.summary.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: 10, padding: '10px 14px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--accent)', marginTop: 7, flexShrink: 0,
              }} />
              <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.5, flex: 1 }}>
                {item}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>
            Updated {new Date(briefing.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  )
}
