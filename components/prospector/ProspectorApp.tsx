'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Search, Bot, Route, X, ChevronLeft, ChevronRight,
  Plus, Phone, Navigation, Filter,
  BarChart3, Upload, Settings, Play, Pause,
  Target, Zap, Clock, Truck,
  ArrowUpDown, Crosshair,
  Check, Loader2,
  Save, CircleDot,
  type LucideIcon,
} from 'lucide-react'
import { GoogleMapComponent } from './GoogleMapComponent'
import { ProspectDetailDrawer } from './ProspectDetailDrawer'
import { AIProspectModal } from './AIProspectModal'
import { CampaignModal } from './CampaignModal'
import { CSVImportModal } from './CSVImportModal'
import { StatsPanel } from './StatsPanel'

// ── Types ──────────────────────────────────────────────────────
export interface Prospect {
  id: string
  org_id: string
  business_name: string
  business_type: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  website: string | null
  email: string | null
  contact_name: string | null
  contact_title: string | null
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  estimated_fleet_size: number
  estimated_vehicle_types: string[] | null
  annual_revenue_estimate: string | null
  employee_count_estimate: string | null
  ai_score: number
  ai_score_reasoning: string | null
  ai_suggested_pitch: string | null
  tags: string[] | null
  status: string
  priority: string
  assigned_to: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  notes: string | null
  discovered_via: string
  photos: string[] | null
  created_at: string
  updated_at?: string
  assignee?: { id: string; name: string } | null
}

export interface ProspectInteraction {
  id: string
  prospect_id: string
  user_id: string
  interaction_type: string
  notes: string | null
  outcome: string | null
  next_action: string | null
  next_action_date: string | null
  created_at: string
  user?: { name: string } | null
}

export interface ProspectingRoute {
  id: string
  org_id: string
  name: string | null
  created_by: string | null
  prospect_ids: string[] | null
  total_distance_miles: number | null
  estimated_duration_minutes: number | null
  status: string
  started_at: string | null
  completed_at: string | null
  date_scheduled: string | null
  notes: string | null
  created_at: string
}

export interface ProspectingCampaign {
  id: string
  org_id: string
  name: string | null
  description: string | null
  target_business_types: string[] | null
  target_radius_miles: number
  target_city: string | null
  target_state: string | null
  target_zip: string | null
  ai_auto_run: boolean
  ai_run_schedule: string | null
  ai_max_prospects_per_run: number
  min_ai_score: number
  status: string
  prospects_found: number
  last_run_at: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
}

// ── Constants ──────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  uncontacted: '#4f7fff',
  contacted: '#f59e0b',
  interested: '#22c07a',
  quoted: '#8b5cf6',
  won: '#ffd700',
  lost: '#505a6b',
  not_interested: '#505a6b',
  follow_up: '#22d3ee',
  hot: '#f25a5a',
}

const PRIORITY_COLORS: Record<string, string> = {
  hot: '#f25a5a',
  high: '#f59e0b',
  medium: '#4f7fff',
  low: '#505a6b',
}

const STATUS_OPTIONS = ['uncontacted', 'contacted', 'interested', 'quoted', 'won', 'lost', 'not_interested', 'follow_up']
const PRIORITY_OPTIONS = ['hot', 'high', 'medium', 'low']
const SORT_OPTIONS = [
  { value: 'ai_score', label: 'AI Score' },
  { value: 'distance', label: 'Distance' },
  { value: 'last_contacted', label: 'Last Contacted' },
  { value: 'created_at', label: 'Date Added' },
]

const BUSINESS_TYPES = [
  'Food Trucks', 'Restaurants', 'Food Delivery', 'Construction',
  'Landscaping', 'Plumbing/HVAC', 'Electricians', 'Real Estate',
  'Car Dealerships', 'Auto Repair', 'Towing Companies', 'Moving Companies',
  'Delivery/Courier', 'Contractors', 'Retail', 'Healthcare/Medical Transport',
  'Event Companies', 'Food Manufacturers', 'Breweries/Wineries',
]

// ── Props ──────────────────────────────────────────────────────
interface ProspectorAppProps {
  profile: Profile
  initialProspects: Prospect[]
  initialRoutes: ProspectingRoute[]
  initialCampaigns: ProspectingCampaign[]
  team: TeamMember[]
}

export default function ProspectorApp({
  profile,
  initialProspects,
  initialRoutes,
  initialCampaigns,
  team,
}: ProspectorAppProps) {
  const supabase = createClient()

  // ── State ────────────────────────────────────────────────────
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
  const [routes, setRoutes] = useState<ProspectingRoute[]>(initialRoutes)
  const [campaigns, setCampaigns] = useState<ProspectingCampaign[]>(initialCampaigns)

  // UI
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [leftTab, setLeftTab] = useState<'prospects' | 'routes' | 'campaigns' | 'settings'>('prospects')
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [assignedFilter, setAssignedFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('ai_score')
  const [searchQuery, setSearchQuery] = useState('')

  // Route builder
  const [routeMode, setRouteMode] = useState(false)
  const [routeStops, setRouteStops] = useState<string[]>([])
  const [navigationMode, setNavigationMode] = useState(false)
  const [currentNavStop, setCurrentNavStop] = useState(0)

  // Map
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 47.6062, lng: -122.3321 })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    defaultRadius: 10,
    minScore: 60,
    targetTypes: [] as string[],
    autoRunSchedule: 'never',
    maxPerRun: 50,
  })

  // ── Responsive ───────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Geolocation ──────────────────────────────────────────────
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(loc)
          setMapCenter(loc)
        },
        () => { /* denied or error — keep default */ }
      )
    }
  }, [])

  useEffect(() => { getUserLocation() }, [getUserLocation])

  // ── Filtering & Sorting ──────────────────────────────────────
  const filteredProspects = useMemo(() => {
    let result = [...prospects]
    if (statusFilter.length > 0) result = result.filter(p => statusFilter.includes(p.status))
    if (priorityFilter) result = result.filter(p => p.priority === priorityFilter)
    if (assignedFilter) result = result.filter(p => p.assigned_to === assignedFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.business_name.toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.contact_name || '').toLowerCase().includes(q) ||
        (p.business_type || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'ai_score': return (b.ai_score || 0) - (a.ai_score || 0)
        case 'last_contacted':
          return new Date(b.last_contacted_at || 0).getTime() - new Date(a.last_contacted_at || 0).getTime()
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default: return (b.ai_score || 0) - (a.ai_score || 0)
      }
    })
    return result
  }, [prospects, statusFilter, priorityFilter, assignedFilter, searchQuery, sortBy])

  // ── Prospect Actions ─────────────────────────────────────────
  const selectProspect = useCallback((p: Prospect) => {
    setSelectedProspect(p)
    setRightDrawerOpen(true)
    if (p.lat && p.lng) setMapCenter({ lat: Number(p.lat), lng: Number(p.lng) })
  }, [])

  const updateProspect = useCallback(async (id: string, updates: Partial<Prospect>) => {
    const { error } = await supabase
      .from('prospects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setProspects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
      if (selectedProspect?.id === id) {
        setSelectedProspect(prev => prev ? { ...prev, ...updates } : null)
      }
    }
  }, [supabase, selectedProspect])

  const addProspectsFromAI = useCallback((newProspects: Prospect[]) => {
    setProspects(prev => [...newProspects, ...prev])
  }, [])

  // ── Route Actions ────────────────────────────────────────────
  const toggleRouteStop = useCallback((prospectId: string) => {
    setRouteStops(prev =>
      prev.includes(prospectId) ? prev.filter(id => id !== prospectId) : [...prev, prospectId]
    )
  }, [])

  const saveRoute = useCallback(async (name: string, dateScheduled: string) => {
    const { data, error } = await supabase
      .from('prospecting_routes')
      .insert({
        org_id: profile.org_id || ORG_ID,
        name,
        assigned_to: profile.id,
        prospect_ids: routeStops,
        status: 'planned',
      })
      .select()
      .single()
    if (!error && data) {
      setRoutes(prev => [data, ...prev])
      setRouteStops([])
      setRouteMode(false)
    }
  }, [supabase, profile, routeStops])

  const startNavigation = useCallback((route: ProspectingRoute) => {
    if (route.prospect_ids && route.prospect_ids.length > 0) {
      setRouteStops(route.prospect_ids)
      setNavigationMode(true)
      setCurrentNavStop(0)
      const first = prospects.find(p => p.id === route.prospect_ids![0])
      if (first?.lat && first?.lng) setMapCenter({ lat: Number(first.lat), lng: Number(first.lng) })
    }
  }, [prospects])

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return {
      uncontacted: prospects.filter(p => p.status === 'uncontacted').length,
      hot: prospects.filter(p => p.priority === 'hot').length,
      thisWeek: prospects.filter(p => new Date(p.created_at) > weekAgo).length,
    }
  }, [prospects])

  const routeProspects = useMemo(() => {
    return routeStops.map(id => prospects.find(p => p.id === id)).filter(Boolean) as Prospect[]
  }, [routeStops, prospects])

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', overflow: 'hidden', zIndex: 1 }}>

      {/* ── MAP ──────────────────────────────────────────────── */}
      <GoogleMapComponent
        prospects={filteredProspects}
        selectedProspect={selectedProspect}
        routeMode={routeMode}
        routeStops={routeStops}
        navigationMode={navigationMode}
        currentNavStop={currentNavStop}
        center={mapCenter}
        userLocation={userLocation}
        onSelectProspect={selectProspect}
        onToggleRouteStop={toggleRouteStop}
        onCenterChange={setMapCenter}
      />

      {/* ── TOP FLOATING BAR ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 16,
        background: 'rgba(19,21,28,0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(79,127,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : 720,
        width: isMobile ? 'calc(100vw - 32px)' : 'auto',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 10px',
          flex: isMobile ? '1 1 100%' : '0 1 200px',
        }}>
          <Search size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <input
            type="text" placeholder="Search businesses..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text1)', fontSize: 13, outline: 'none', width: '100%' }}
          />
        </div>

        <button onClick={() => setShowAIModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)', color: '#fff',
          fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 0 20px rgba(79,127,255,0.3)',
        }}>
          <Bot size={15} /> AI Prospect
        </button>

        <button onClick={() => { setRouteMode(!routeMode); if (routeMode) setRouteStops([]) }} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          background: routeMode ? 'rgba(255,107,0,0.2)' : 'rgba(255,255,255,0.08)',
          color: routeMode ? '#ff6b00' : 'var(--text2)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
          border: routeMode ? '1px solid rgba(255,107,0,0.3)' : '1px solid transparent',
        }}>
          <Route size={15} /> {routeMode ? 'Building...' : 'Build Route'}
        </button>

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            <span><strong style={{ color: '#4f7fff' }}>{stats.uncontacted}</strong> new</span>
            <span><strong style={{ color: '#f25a5a' }}>{stats.hot}</strong> hot</span>
            <span><strong style={{ color: '#22c07a' }}>{stats.thisWeek}</strong> /wk</span>
          </div>
        )}

        <button onClick={() => setShowStats(!showStats)} style={{
          display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8,
          background: showStats ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.05)',
          color: showStats ? 'var(--accent)' : 'var(--text3)', border: 'none', cursor: 'pointer',
        }}>
          <BarChart3 size={16} />
        </button>

        <button onClick={() => setShowCSVModal(true)} title="Import CSV" style={{
          display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', color: 'var(--text3)', border: 'none', cursor: 'pointer',
        }}>
          <Upload size={16} />
        </button>

        <button onClick={getUserLocation} title="My Location" style={{
          display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', color: 'var(--text3)', border: 'none', cursor: 'pointer',
        }}>
          <Crosshair size={16} />
        </button>
      </div>

      {/* ── STATS PANEL ──────────────────────────────────────── */}
      {showStats && <StatsPanel prospects={prospects} onClose={() => setShowStats(false)} />}

      {/* ── LEFT PANEL ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: isMobile ? 70 : 0, left: 0, bottom: 0,
        width: leftPanelOpen ? (isMobile ? '100%' : 380) : 0,
        background: 'rgba(13,15,20,0.95)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border)', zIndex: 8,
        display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: 16, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 800,
              color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Target size={18} style={{ color: 'var(--accent)' }} />
              AI Prospector
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
              {prospects.length} prospects
            </div>
          </div>
          <button onClick={() => setLeftPanelOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4,
          }}>
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {(['prospects', 'routes', 'campaigns', 'settings'] as const).map(tab => (
            <button key={tab} onClick={() => setLeftTab(tab)} style={{
              flex: 1, padding: '10px 0', fontSize: 12,
              fontWeight: leftTab === tab ? 600 : 400,
              color: leftTab === tab ? 'var(--accent)' : 'var(--text3)',
              background: 'none', border: 'none',
              borderBottom: leftTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {leftTab === 'prospects' && (
            <ProspectsTab
              prospects={filteredProspects} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
              assignedFilter={assignedFilter} setAssignedFilter={setAssignedFilter}
              sortBy={sortBy} setSortBy={setSortBy} team={team} onSelect={selectProspect}
              selectedId={selectedProspect?.id || null} routeMode={routeMode}
              routeStops={routeStops} onToggleRouteStop={toggleRouteStop}
            />
          )}
          {leftTab === 'routes' && (
            <RoutesTab routes={routes} prospects={prospects} onStartRoute={startNavigation} onNewRoute={() => setRouteMode(true)} />
          )}
          {leftTab === 'campaigns' && (
            <CampaignsTab
              campaigns={campaigns}
              onNewCampaign={() => setShowCampaignModal(true)}
              onToggleCampaign={async (id, active) => {
                await supabase.from('prospecting_campaigns').update({ status: active ? 'active' : 'paused' }).eq('id', id)
                setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: active ? 'active' : 'paused' } : c))
              }}
              onRunCampaign={async (id) => {
                try {
                  const res = await fetch(`/api/prospector/campaigns/${id}/run`, { method: 'POST' })
                  const data = await res.json()
                  if (data.prospects) setProspects(prev => [...data.prospects, ...prev])
                  setCampaigns(prev => prev.map(c => c.id === id ? {
                    ...c, prospects_found: c.prospects_found + (data.saved || 0),
                    last_run_at: new Date().toISOString(),
                  } : c))
                } catch { /* handled */ }
              }}
            />
          )}
          {leftTab === 'settings' && <AISettingsTab settings={aiSettings} onChange={setAiSettings} />}
        </div>
      </div>

      {/* Left panel toggle */}
      {!leftPanelOpen && (
        <button onClick={() => setLeftPanelOpen(true)} style={{
          position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 8,
          background: 'rgba(13,15,20,0.9)', border: '1px solid var(--border)', borderLeft: 'none',
          borderRadius: '0 8px 8px 0', padding: '16px 4px', color: 'var(--text2)', cursor: 'pointer',
        }}>
          <ChevronRight size={16} />
        </button>
      )}

      {/* ── RIGHT DRAWER ─────────────────────────────────────── */}
      {rightDrawerOpen && selectedProspect && (
        <ProspectDetailDrawer
          prospect={selectedProspect} profile={profile} team={team}
          isMobile={isMobile}
          onClose={() => { setRightDrawerOpen(false); setSelectedProspect(null) }}
          onUpdate={updateProspect} supabase={supabase}
        />
      )}

      {/* ── BOTTOM ROUTE BAR ─────────────────────────────────── */}
      {routeMode && routeStops.length > 0 && !navigationMode && (
        <RouteBottomBar
          stops={routeProspects}
          onOptimize={() => {
            const sorted = [...routeStops].sort((a, b) => {
              const pa = prospects.find(p => p.id === a)
              const pb = prospects.find(p => p.id === b)
              return (Number(pa?.lat) || 0) - (Number(pb?.lat) || 0)
            })
            setRouteStops(sorted)
          }}
          onSave={saveRoute}
          onStartNav={() => { setNavigationMode(true); setCurrentNavStop(0) }}
          onClear={() => { setRouteStops([]); setRouteMode(false) }}
        />
      )}

      {/* ── NAVIGATION MODE ──────────────────────────────────── */}
      {navigationMode && routeStops.length > 0 && (
        <NavigationOverlay
          stops={routeProspects} currentStop={currentNavStop}
          onNext={() => {
            if (currentNavStop < routeStops.length - 1) {
              const next = currentNavStop + 1
              setCurrentNavStop(next)
              const p = prospects.find(pr => pr.id === routeStops[next])
              if (p?.lat && p?.lng) setMapCenter({ lat: Number(p.lat), lng: Number(p.lng) })
            }
          }}
          onMarkVisited={async () => {
            const pid = routeStops[currentNavStop]
            await supabase.from('prospect_interactions').insert({
              prospect_id: pid, user_id: profile.id,
              interaction_type: 'visit', outcome: 'spoke_with_owner', notes: 'Visited during route',
            })
            await updateProspect(pid, { status: 'contacted', last_contacted_at: new Date().toISOString() })
            if (currentNavStop < routeStops.length - 1) {
              const next = currentNavStop + 1
              setCurrentNavStop(next)
              const p = prospects.find(pr => pr.id === routeStops[next])
              if (p?.lat && p?.lng) setMapCenter({ lat: Number(p.lat), lng: Number(p.lng) })
            }
          }}
          onEnd={() => { setNavigationMode(false); setRouteMode(false); setRouteStops([]) }}
          onSelectProspect={selectProspect}
        />
      )}

      {/* ── MODALS ───────────────────────────────────────────── */}
      {showAIModal && (
        <AIProspectModal profile={profile} onClose={() => setShowAIModal(false)}
          onResults={addProspectsFromAI} settings={aiSettings} />
      )}
      {showCampaignModal && (
        <CampaignModal profile={profile} onClose={() => setShowCampaignModal(false)}
          onCreated={(c) => { setCampaigns(prev => [c, ...prev]); setShowCampaignModal(false) }} />
      )}
      {showCSVModal && (
        <CSVImportModal profile={profile} onClose={() => setShowCSVModal(false)}
          onImported={(np) => { setProspects(prev => [...np, ...prev]); setShowCSVModal(false) }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════

function FilterChip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: active ? 600 : 400,
      color: active ? '#fff' : 'var(--text3)',
      background: active ? (color || 'var(--accent)') + '33' : 'rgba(255,255,255,0.04)',
      border: active ? `1px solid ${color || 'var(--accent)'}55` : '1px solid transparent',
      cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function ProspectsTab({
  prospects, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
  assignedFilter, setAssignedFilter, sortBy, setSortBy, team, onSelect, selectedId,
  routeMode, routeStops, onToggleRouteStop,
}: {
  prospects: Prospect[]; statusFilter: string[]; setStatusFilter: Dispatch<SetStateAction<string[]>>
  priorityFilter: string; setPriorityFilter: (v: string) => void
  assignedFilter: string; setAssignedFilter: (v: string) => void
  sortBy: string; setSortBy: (v: string) => void; team: TeamMember[]
  onSelect: (p: Prospect) => void; selectedId: string | null
  routeMode: boolean; routeStops: string[]; onToggleRouteStop: (id: string) => void
}) {
  return (
    <div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <FilterChip label="All" active={statusFilter.length === 0} onClick={() => setStatusFilter([])} />
          {STATUS_OPTIONS.slice(0, 6).map(s => (
            <FilterChip key={s} label={s.replace('_', ' ')} active={statusFilter.includes(s)}
              color={STATUS_COLORS[s]}
              onClick={() => setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text2)', fontSize: 11, padding: '4px 6px',
          }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text2)', fontSize: 11, padding: '4px 6px',
          }}>
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text2)', fontSize: 11, padding: '4px 6px',
          }}>
            <option value="">All Agents</option>
            {team.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
          </select>
        </div>
      </div>
      <div style={{ padding: '4px 8px' }}>
        {prospects.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            <Target size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>No prospects yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Use AI Prospect to find businesses</div>
          </div>
        ) : prospects.map(p => (
          <ProspectCard key={p.id} prospect={p} isSelected={p.id === selectedId} onClick={() => onSelect(p)}
            routeMode={routeMode} inRoute={routeStops.includes(p.id)} routeIndex={routeStops.indexOf(p.id)}
            onToggleRoute={() => onToggleRouteStop(p.id)} />
        ))}
      </div>
    </div>
  )
}

function ProspectCard({ prospect: p, isSelected, onClick, routeMode, inRoute, routeIndex, onToggleRoute }: {
  prospect: Prospect; isSelected: boolean; onClick: () => void
  routeMode: boolean; inRoute: boolean; routeIndex: number; onToggleRoute: () => void
}) {
  const scoreColor = p.ai_score >= 70 ? '#22c07a' : p.ai_score >= 40 ? '#f59e0b' : '#f25a5a'
  const daysSince = p.last_contacted_at
    ? Math.floor((Date.now() - new Date(p.last_contacted_at).getTime()) / 86400000)
    : null

  return (
    <div onClick={onClick} style={{
      padding: '10px 12px', marginBottom: 2, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
      background: isSelected ? 'rgba(79,127,255,0.1)' : inRoute ? 'rgba(255,107,0,0.08)' : 'rgba(255,255,255,0.02)',
      border: isSelected ? '1px solid rgba(79,127,255,0.3)' : inRoute ? '1px solid rgba(255,107,0,0.2)' : '1px solid transparent',
      borderLeft: `3px solid ${PRIORITY_COLORS[p.priority] || 'transparent'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {routeMode && inRoute ? (
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#ff6b00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>{routeIndex + 1}</div>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: scoreColor + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: scoreColor, flexShrink: 0,
            fontFamily: 'JetBrains Mono, monospace',
          }}>{p.ai_score}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.business_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.business_type && <span style={{ color: 'var(--text2)' }}>{p.business_type}</span>}
            {p.business_type && p.address ? ' · ' : ''}{p.address}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
              background: (STATUS_COLORS[p.status] || '#555') + '22', color: STATUS_COLORS[p.status] || '#999',
              textTransform: 'capitalize',
            }}>{p.status.replace('_', ' ')}</span>
            {daysSince !== null && (
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</span>
            )}
            {p.estimated_fleet_size > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Truck size={10} /> {p.estimated_fleet_size}
              </span>
            )}
          </div>
        </div>
        {routeMode && (
          <button onClick={(e) => { e.stopPropagation(); onToggleRoute() }} style={{
            width: 24, height: 24, borderRadius: 6,
            background: inRoute ? '#ff6b00' : 'rgba(255,255,255,0.08)',
            color: inRoute ? '#fff' : 'var(--text3)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {inRoute ? <Check size={12} /> : <Plus size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}

function RoutesTab({ routes, prospects, onStartRoute, onNewRoute }: {
  routes: ProspectingRoute[]; prospects: Prospect[]
  onStartRoute: (r: ProspectingRoute) => void; onNewRoute: () => void
}) {
  return (
    <div style={{ padding: 12 }}>
      <button onClick={onNewRoute} style={{
        width: '100%', padding: 10, borderRadius: 8, background: 'rgba(255,107,0,0.1)',
        border: '1px dashed rgba(255,107,0,0.3)', color: '#ff6b00', fontSize: 13,
        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12,
      }}>
        <Plus size={14} /> New Route
      </button>
      {routes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 12 }}>
          <Route size={30} style={{ opacity: 0.3, marginBottom: 8 }} /><div>No routes yet</div>
        </div>
      ) : routes.map(r => (
        <div key={r.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>{r.name || 'Unnamed Route'}</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
            <span>{(r.prospect_ids || []).length} stops</span>
            {r.total_distance_miles && <span>{r.total_distance_miles}mi</span>}
            {r.date_scheduled && <span>{r.date_scheduled}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
              background: r.status === 'completed' ? 'rgba(34,192,122,0.15)' : 'rgba(255,255,255,0.05)',
              color: r.status === 'completed' ? '#22c07a' : 'var(--text3)',
            }}>{r.status}</span>
            <button onClick={() => onStartRoute(r)} style={{
              padding: '2px 10px', borderRadius: 4, background: 'rgba(34,192,122,0.15)', color: '#22c07a',
              border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}><Play size={10} /> Start</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CampaignsTab({ campaigns, onNewCampaign, onToggleCampaign, onRunCampaign }: {
  campaigns: ProspectingCampaign[]; onNewCampaign: () => void
  onToggleCampaign: (id: string, active: boolean) => void; onRunCampaign: (id: string) => void
}) {
  const [running, setRunning] = useState<string | null>(null)
  return (
    <div style={{ padding: 12 }}>
      <button onClick={onNewCampaign} style={{
        width: '100%', padding: 10, borderRadius: 8, background: 'rgba(79,127,255,0.1)',
        border: '1px dashed rgba(79,127,255,0.3)', color: 'var(--accent)', fontSize: 13,
        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12,
      }}>
        <Plus size={14} /> New Campaign
      </button>
      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 12 }}>
          <Zap size={30} style={{ opacity: 0.3, marginBottom: 8 }} /><div>No campaigns yet</div>
        </div>
      ) : campaigns.map(c => (
        <div key={c.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{c.name || 'Unnamed'}</div>
            <button onClick={() => onToggleCampaign(c.id, c.status !== 'active')} style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative',
              background: c.status === 'active' ? 'var(--accent)' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: c.status === 'active' ? 19 : 3, transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
            {(c.target_business_types || []).join(', ') || 'All types'}
            {c.target_city ? ` in ${c.target_city}` : ''}{c.target_zip ? ` (${c.target_zip})` : ''}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
            <span>Found: <strong style={{ color: 'var(--text1)' }}>{c.prospects_found}</strong></span>
            {c.last_run_at && <span>Last: {new Date(c.last_run_at).toLocaleDateString()}</span>}
          </div>
          <button onClick={async () => { setRunning(c.id); await onRunCampaign(c.id); setRunning(null) }}
            disabled={running === c.id} style={{
              padding: '4px 12px', borderRadius: 6, background: 'rgba(34,192,122,0.15)', color: '#22c07a',
              border: 'none', fontSize: 11, fontWeight: 600, cursor: running === c.id ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            {running === c.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />}
            {running === c.id ? 'Running...' : 'Run Now'}
          </button>
        </div>
      ))}
    </div>
  )
}

function AISettingsTab({ settings, onChange }: { settings: any; onChange: (s: any) => void }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>
          Default Search Radius: {settings.defaultRadius} miles
        </label>
        <input type="range" min={1} max={50} value={settings.defaultRadius}
          onChange={(e) => onChange({ ...settings, defaultRadius: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>
          Min AI Score to Auto-Save: {settings.minScore}
        </label>
        <input type="range" min={0} max={100} value={settings.minScore}
          onChange={(e) => onChange({ ...settings, minScore: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'block' }}>Business Types to Target</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {BUSINESS_TYPES.map(t => (
            <button key={t} onClick={() => {
              const types = settings.targetTypes.includes(t) ? settings.targetTypes.filter((x: string) => x !== t) : [...settings.targetTypes, t]
              onChange({ ...settings, targetTypes: types })
            }} style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
              background: settings.targetTypes.includes(t) ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
              color: settings.targetTypes.includes(t) ? 'var(--accent)' : 'var(--text3)',
              border: settings.targetTypes.includes(t) ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Auto-Run Schedule</label>
        <select value={settings.autoRunSchedule} onChange={(e) => onChange({ ...settings, autoRunSchedule: e.target.value })} style={{
          width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13,
        }}>
          <option value="never">Never</option><option value="daily">Daily</option>
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Max Prospects Per AI Run</label>
        <input type="number" min={5} max={200} value={settings.maxPerRun}
          onChange={(e) => onChange({ ...settings, maxPerRun: Number(e.target.value) })}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13,
          }} />
      </div>
      <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CircleDot size={12} style={{ color: '#f59e0b' }} />
          Google Maps API: Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
        </div>
      </div>
    </div>
  )
}

function RouteBottomBar({ stops, onOptimize, onSave, onStartNav, onClear }: {
  stops: Prospect[]; onOptimize: () => void
  onSave: (name: string, date: string) => void; onStartNav: () => void; onClear: () => void
}) {
  const [showSave, setShowSave] = useState(false)
  const [routeName, setRouteName] = useState(`Route - ${new Date().toLocaleDateString()}`)
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0])

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
      background: 'rgba(19,21,28,0.92)', backdropFilter: 'blur(20px)', borderRadius: 16,
      border: '1px solid rgba(255,107,0,0.2)', padding: '12px 20px',
      display: 'flex', flexDirection: 'column', gap: 10, minWidth: 400, maxWidth: 'calc(100vw - 40px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ff6b00', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Route size={15} /> Route: {stops.length} stops
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onOptimize} style={{
            padding: '5px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
            border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}><ArrowUpDown size={11} /> Optimize</button>
          <button onClick={() => setShowSave(!showSave)} style={{
            padding: '5px 10px', borderRadius: 6, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)',
            border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}><Save size={11} /> Save</button>
          <button onClick={onStartNav} style={{
            padding: '5px 10px', borderRadius: 6, background: 'rgba(34,192,122,0.15)', color: '#22c07a',
            border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}><Play size={11} /> Start</button>
          <button onClick={onClear} style={{
            padding: '5px 10px', borderRadius: 6, background: 'rgba(242,90,90,0.15)', color: '#f25a5a',
            border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}><X size={11} /></button>
        </div>
      </div>
      {showSave && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Route name..." style={{
            flex: 1, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 12,
          }} />
          <input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 12,
          }} />
          <button onClick={() => { onSave(routeName, routeDate); setShowSave(false) }} style={{
            padding: '6px 14px', borderRadius: 6, background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Save</button>
        </div>
      )}
    </div>
  )
}

function NavigationOverlay({ stops, currentStop, onNext, onMarkVisited, onEnd, onSelectProspect }: {
  stops: Prospect[]; currentStop: number; onNext: () => void
  onMarkVisited: () => void; onEnd: () => void; onSelectProspect: (p: Prospect) => void
}) {
  const current = stops[currentStop]
  if (!current) return null
  return (
    <>
      <div style={{
        position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 11,
        background: 'rgba(19,21,28,0.92)', backdropFilter: 'blur(20px)', borderRadius: 12,
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid rgba(34,192,122,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <Navigation size={16} style={{ color: '#22c07a' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Stop {currentStop + 1} of {stops.length}</span>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ width: `${((currentStop + 1) / stops.length) * 100}%`, height: '100%', borderRadius: 2, background: '#22c07a', transition: 'width 0.3s' }} />
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 11,
        background: 'rgba(19,21,28,0.95)', backdropFilter: 'blur(20px)', borderRadius: 16,
        padding: 16, width: 'min(440px, calc(100vw - 40px))',
        border: '1px solid rgba(34,192,122,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#ff6b00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>{currentStop + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>{current.business_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{current.address}</div>
            {current.contact_name && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Contact: {current.contact_name}</div>}
            {current.ai_suggested_pitch && (
              <div style={{ fontSize: 11, color: '#22d3ee', fontStyle: 'italic', marginTop: 6, lineHeight: 1.4 }}>
                {current.ai_suggested_pitch}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {current.phone && (
            <a href={`tel:${current.phone}`} style={{
              padding: '8px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.15)', color: '#22c07a',
              textDecoration: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}><Phone size={12} /> Call</a>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(current.address || current.business_name)}`}
            target="_blank" rel="noopener noreferrer" style={{
              padding: '8px 12px', borderRadius: 8, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)',
              textDecoration: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}><Navigation size={12} /> Directions</a>
          <button onClick={onMarkVisited} style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, background: '#22c07a', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}><Check size={14} /> Mark Visited</button>
          <button onClick={onEnd} style={{
            padding: '8px 12px', borderRadius: 8, background: 'rgba(242,90,90,0.15)', color: '#f25a5a',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>End</button>
        </div>
      </div>
    </>
  )
}
