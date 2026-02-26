'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RouteLog {
  id: string
  route_name: string | null
  route_date: string
  ai_impression_estimate: number | null
  calls_that_day: number
  scans_that_day: number
}

interface RouteABComparisonProps {
  campaignId: string
  routes?: RouteLog[]
}

export default function RouteABComparison({ campaignId, routes: initialRoutes }: RouteABComparisonProps) {
  const [routes, setRoutes] = useState<RouteLog[]>(initialRoutes || [])
  const [loading, setLoading] = useState(!initialRoutes)

  useEffect(() => {
    if (initialRoutes) return
    const supabase = createClient()
    async function fetchRoutes() {
      const { data } = await supabase
        .from('wrap_route_logs')
        .select('id, route_name, route_date, ai_impression_estimate, calls_that_day, scans_that_day')
        .eq('campaign_id', campaignId)
        .order('route_date', { ascending: true })
      if (data) setRoutes(data)
      setLoading(false)
    }
    fetchRoutes()
  }, [campaignId, initialRoutes])

  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
        <Loader2 size={20} style={{ color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (routes.length < 2) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Route A/B Comparison</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Log at least 2 routes to see AI comparison. Use the Route Mapper to track different driving days.
        </p>
      </div>
    )
  }

  // Simple grouping: split routes in half for A vs B comparison
  const midpoint = Math.ceil(routes.length / 2)
  const routeA = routes.slice(0, midpoint)
  const routeB = routes.slice(midpoint)

  const avgCalls = (group: RouteLog[]) => group.length > 0 ? group.reduce((s, r) => s + r.calls_that_day, 0) / group.length : 0
  const avgScans = (group: RouteLog[]) => group.length > 0 ? group.reduce((s, r) => s + r.scans_that_day, 0) / group.length : 0
  const avgImpressions = (group: RouteLog[]) => {
    const valid = group.filter(r => r.ai_impression_estimate)
    return valid.length > 0 ? valid.reduce((s, r) => s + (r.ai_impression_estimate || 0), 0) / valid.length : 0
  }

  const aCallsAvg = avgCalls(routeA)
  const bCallsAvg = avgCalls(routeB)
  const aScansAvg = avgScans(routeA)
  const bScansAvg = avgScans(routeB)
  const aImpAvg = avgImpressions(routeA)
  const bImpAvg = avgImpressions(routeB)

  const bestRoute = aCallsAvg > bCallsAvg ? 'A' : bCallsAvg > aCallsAvg ? 'B' : 'tie'
  const multiplier = bestRoute === 'A' && bCallsAvg > 0
    ? (aCallsAvg / bCallsAvg).toFixed(1)
    : bestRoute === 'B' && aCallsAvg > 0
    ? (bCallsAvg / aCallsAvg).toFixed(1)
    : '1.0'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Route A/B Comparison</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Route A', days: routeA.length, calls: aCallsAvg, scans: aScansAvg, impressions: aImpAvg, best: bestRoute === 'A' },
          { label: 'Route B', days: routeB.length, calls: bCallsAvg, scans: bScansAvg, impressions: bImpAvg, best: bestRoute === 'B' },
        ].map(route => (
          <div key={route.label} style={{
            background: 'var(--surface2)',
            border: route.best ? '1px solid var(--green)' : '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{route.label}</span>
              {route.best && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--green)',
                  background: 'rgba(34,192,122,0.1)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}>Best</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              {route.days} day{route.days !== 1 ? 's' : ''} logged
            </div>
            {[
              { label: 'Calls/day', value: route.calls.toFixed(1) },
              { label: 'Scans/day', value: route.scans.toFixed(1) },
              { label: 'Impressions', value: Math.round(route.impressions).toLocaleString() },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{stat.label}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)', fontWeight: 600 }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* AI recommendation */}
      {bestRoute !== 'tie' && (
        <div style={{
          background: 'rgba(34,211,238,0.06)',
          border: '1px solid rgba(34,211,238,0.15)',
          borderRadius: 10,
          padding: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>
            AI Recommendation
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
            Route {bestRoute} generates {multiplier}x more calls on average. Prioritizing this route could increase your monthly leads.
          </div>
        </div>
      )}
    </div>
  )
}
