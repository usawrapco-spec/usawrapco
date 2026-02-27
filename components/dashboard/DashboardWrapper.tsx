'use client'

import { useEffect, useState } from 'react'
import DepartmentNav from '@/components/pipeline/DepartmentNav'
import { useToast } from '@/components/shared/Toast'
import { Trophy, Zap } from 'lucide-react'

interface DashboardWrapperProps {
  orgId: string
  profileId: string
  role: string
  children: React.ReactNode  // existing DashboardClient goes here
}

export default function DashboardWrapper({ orgId, profileId, role, children }: DashboardWrapperProps) {
  const { xpToast, badgeToast } = useToast()
  const [levelUp, setLevelUp] = useState<number | null>(null)

  // Award daily login XP once per day (localStorage guard to persist across refreshes)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const key = `usawrap_login_xp_${today}`
    if (localStorage.getItem(key)) return

    fetch('/api/xp/daily-login', { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { xpAwarded?: number; streak?: number; leveledUp?: boolean; newLevel?: number } | null) => {
        if (!data) return
        localStorage.setItem(key, '1')
        if ((data.xpAwarded || 0) > 0) {
          const label = (data.streak || 0) > 1
            ? `Daily login · ${data.streak}-day streak!`
            : 'Daily login bonus'
          xpToast(data.xpAwarded!, label, data.leveledUp, data.newLevel)
        }
        if (data.leveledUp && data.newLevel) {
          setLevelUp(data.newLevel)
        }
        if ((data as any).newBadges?.length) {
          badgeToast((data as any).newBadges)
        }
      })
      .catch((error) => { console.error(error); })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <DepartmentNav
        orgId={orgId}
        profileId={profileId}
        role={role}
      >
        {children}
      </DepartmentNav>

      {/* Level-up celebration modal */}
      {levelUp && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setLevelUp(null)}
        >
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 20, padding: '40px 48px', textAlign: 'center', maxWidth: 380 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(79,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trophy size={36} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--accent)', marginBottom: 8 }}>
              LEVEL UP!
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
              You reached Level {levelUp}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
              Keep logging in daily and completing jobs to earn more XP.
            </div>
            <button
              onClick={() => setLevelUp(null)}
              style={{ padding: '10px 32px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
            >
              Keep Going
            </button>
          </div>
        </div>
      )}
    </>
  )
}
