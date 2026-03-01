'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const PNWTopNav = dynamic(() => import('@/components/pnw/PNWTopNav'), { ssr: false })
const PNWMapEngine = dynamic(() => import('@/components/pnw/PNWMapEngine'), { ssr: false })
const EmergencyAlertBanner = dynamic(() => import('@/components/pnw/EmergencyAlertBanner'), { ssr: false })
const TidePanel = dynamic(() => import('@/components/pnw/TidePanel'), { ssr: false })
const WeatherPanel = dynamic(() => import('@/components/pnw/WeatherPanel'), { ssr: false })

export default function PNWPageClient() {
  const router = useRouter()
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('map')

  const handleLayerToggle = (key: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'fishing') router.push('/pnw/fishing')
    else if (tab === 'heritage') router.push('/pnw/heritage')
    else if (tab === 'feed') router.push('/pnw/feed')
    else if (tab === 'trip-tracker') router.push('/pnw/trip-tracker')
    else if (tab === 'trip-planner') router.push('/pnw/trip-planner')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <EmergencyAlertBanner />
      <PNWTopNav
        activeLayers={activeLayers}
        onLayerToggle={handleLayerToggle}
        onTabChange={handleTabChange}
        activeTab={activeTab}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <PNWMapEngine
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
          height="100%"
        />
        {activeLayers.has('tides') && (
          <div style={{
            position: 'absolute', bottom: 80, left: 10, zIndex: 1000,
            background: 'rgba(13,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: 12, width: 220, backdropFilter: 'blur(10px)'
          }}>
            <TidePanel station="gig_harbor" compact={false} />
          </div>
        )}
        {activeLayers.has('weather') && (
          <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 1000,
            background: 'rgba(13,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: 12, width: 280, backdropFilter: 'blur(10px)'
          }}>
            <WeatherPanel compact={true} />
          </div>
        )}
      </div>
    </div>
  )
}
