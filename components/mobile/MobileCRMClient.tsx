'use client'

import { useState } from 'react'
import PhoneShell from './PhoneShell'
import MobileRoleSwitcher from './MobileRoleSwitcher'
import MobilePipelineView from './MobilePipelineView'
import MobileEngineView from './MobileEngineView'
import MobileJobDetail from './MobileJobDetail'
import MobileBottomNav from './MobileBottomNav'
import { JOBS_MOCK, type MobileJob, type DemoRole } from './mobileConstants'

type View = 'pipeline' | 'engine'

export default function MobileCRMClient() {
  const [view, setView] = useState<View>('pipeline')
  const [role, setRole] = useState<DemoRole>('owner')
  const [openJob, setOpenJob] = useState<MobileJob | null>(null)
  const [jobs] = useState<MobileJob[]>(JOBS_MOCK)

  return (
    <PhoneShell>
      {/* Role switcher (always visible) */}
      <MobileRoleSwitcher role={role} onSwitch={setRole} />

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {view === 'pipeline' ? (
          <MobilePipelineView
            jobs={jobs}
            onOpenJob={setOpenJob}
          />
        ) : (
          <MobileEngineView jobs={jobs} />
        )}

        {/* Job detail overlay — slides in on top */}
        {openJob && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            animation: 'slideInRight 0.2s ease',
          }}>
            <MobileJobDetail
              job={openJob}
              role={role}
              onBack={() => setOpenJob(null)}
            />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <MobileBottomNav active={view} onNavigate={v => { setOpenJob(null); setView(v) }} />

      {/* Inline keyframe for slide animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </PhoneShell>
  )
}
