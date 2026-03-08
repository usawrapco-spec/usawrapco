'use client'

import { useState, useEffect } from 'react'
import {
  MapPin, Plus, RefreshCw, Calendar, Image as ImageIcon, Send,
  TrendingUp, Eye, MessageSquare, Star, Clock, Check, Loader2,
  Sparkles, Globe, Phone, Navigation, ExternalLink, Settings,
  BarChart3, Users, ThumbsUp, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface GmbLocation {
  id: string
  name: string
  address: string
  phone: string
  rating: number
  reviews: number
  verified: boolean
  connected: boolean
}

interface ScheduledPost {
  id: string
  location_id: string
  content: string
  image_url: string | null
  scheduled_for: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  post_type: 'update' | 'offer' | 'event' | 'product'
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_LOCATIONS: GmbLocation[] = [
  { id: '1', name: 'USA Wrap Co — Gig Harbor', address: '4124 124th St NW, Gig Harbor, WA 98332', phone: '253-525-8148', rating: 4.9, reviews: 95, verified: true, connected: false },
  { id: '2', name: 'USA Wrap Co — Tacoma', address: 'Tacoma, WA', phone: '253-525-8148', rating: 0, reviews: 0, verified: false, connected: false },
]

// ── AI Post templates ─────────────────────────────────────────────────────────
const POST_TEMPLATES = [
  { label: 'Before & After', prompt: 'Share a before/after photo of a recent wrap job' },
  { label: 'Fleet Spotlight', prompt: 'Highlight a fleet wrap project' },
  { label: 'Customer Review', prompt: 'Share a customer testimonial' },
  { label: 'Process Video', prompt: 'Behind-the-scenes of a wrap install' },
  { label: 'Special Offer', prompt: 'Promote a seasonal deal or discount' },
  { label: 'New Service', prompt: 'Announce a new service offering' },
]

const AI_GENERATED_POSTS = [
  "Just wrapped this stunning fleet of 8 Ram ProMasters for Pacific Plumbing! Full coverage, vibrant brand colors, and a design that turns heads on every job site. Your fleet is your best billboard — let's make it count.\n\n#VehicleWrap #FleetGraphics #GigHarbor #USAWrapCo",
  "Color change wraps are here! Transform your ride without the commitment of paint. Satin, gloss, matte — we've got the full spectrum. Book a free consultation today.\n\n#ColorChangeWrap #VinylWrap #PNW #CarWrap",
  "Before vs After: This Ford Transit went from plain white to a rolling billboard for Summit Electrical. Full wrap with door-handle cutouts, QR code, and reflective accents for nighttime visibility.\n\n#BeforeAndAfter #TransitVan #CommercialWrap",
]

type Tab = 'locations' | 'posts' | 'analytics'

export default function GmbManagerPage() {
  const [tab, setTab] = useState<Tab>('locations')
  const [locations, setLocations] = useState<GmbLocation[]>(DEMO_LOCATIONS)
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [composing, setComposing] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState<ScheduledPost['post_type']>('update')
  const [generating, setGenerating] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string>(DEMO_LOCATIONS[0].id)
  const [connected, setConnected] = useState(false)

  async function generatePost(template?: string) {
    setGenerating(true)
    // Simulated AI generation — replace with actual API call
    await new Promise(r => setTimeout(r, 1500))
    const random = AI_GENERATED_POSTS[Math.floor(Math.random() * AI_GENERATED_POSTS.length)]
    setPostContent(template ? `${template}\n\n${random}` : random)
    setGenerating(false)
  }

  function schedulePost() {
    if (!postContent.trim()) return
    const post: ScheduledPost = {
      id: crypto.randomUUID(),
      location_id: selectedLocation,
      content: postContent,
      image_url: null,
      scheduled_for: new Date(Date.now() + 86400000).toISOString(),
      status: 'scheduled',
      post_type: postType,
    }
    setPosts(prev => [post, ...prev])
    setPostContent('')
    setComposing(false)
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'posts',     label: 'Posts',     icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <MapPin size={20} color="#4f7fff" />
            <h1 style={{ color: 'var(--text1)', fontSize: '1.5rem', fontWeight: 700, margin: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>
              Google Business Manager
            </h1>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0 }}>
            Manage your Google Business Profiles, auto-post content, and track performance.
          </p>
        </div>
        {!connected && (
          <button
            onClick={() => setConnected(true)}
            style={{
              background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '0.6rem 1.25rem', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}
          >
            <Globe size={15} /> Connect Google Business
          </button>
        )}
      </div>

      {/* Connection banner */}
      {!connected && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <Settings size={18} color="#f59e0b" />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.85rem' }}>
              Connect your Google Business Profile
            </div>
            <div style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>
              Link your GMB account to enable auto-posting, review monitoring, and analytics.
              Go to Settings → Integrations → Google Business Profile to connect.
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface2)', paddingBottom: 0 }}>
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', borderBottom: `2px solid ${active ? '#4f7fff' : 'transparent'}`,
                color: active ? 'var(--text1)' : 'var(--text3)',
                padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.35rem',
                transition: 'all 0.15s',
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* LOCATIONS TAB */}
      {tab === 'locations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {locations.map(loc => (
            <div key={loc.id} style={{
              background: 'var(--surface)', border: '1px solid var(--surface2)',
              borderRadius: 12, padding: '1.25rem',
              display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: loc.verified ? 'rgba(79,127,255,0.15)' : 'rgba(90,96,128,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MapPin size={20} color={loc.verified ? '#4f7fff' : '#5a6080'} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <h3 style={{ color: 'var(--text1)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{loc.name}</h3>
                  {loc.verified && (
                    <span style={{ background: '#22c07a18', color: '#22c07a', borderRadius: 12, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 600, border: '1px solid #22c07a40' }}>
                      Verified
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  <Navigation size={11} style={{ display: 'inline', marginRight: 4 }} />{loc.address}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>
                  <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />{loc.phone}
                </div>
              </div>
              {/* Stats */}
              <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                {loc.rating > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b' }}>
                      <Star size={14} fill="#f59e0b" />
                      <span style={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem' }}>{loc.rating}</span>
                    </div>
                    <div style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{loc.reviews} reviews</div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            style={{
              background: 'var(--surface)', border: '1px dashed #2a2d3e',
              borderRadius: 10, padding: '1rem', cursor: 'pointer',
              color: 'var(--text3)', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            <Plus size={15} /> Add Location
          </button>
        </div>
      )}

      {/* POSTS TAB */}
      {tab === 'posts' && (
        <div>
          {/* Compose area */}
          {composing ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid #4f7fff40',
              borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ color: 'var(--text1)', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  New Post
                </h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['update', 'offer', 'event', 'product'] as const).map(pt => (
                    <button
                      key={pt}
                      onClick={() => setPostType(pt)}
                      style={{
                        background: postType === pt ? '#4f7fff18' : 'var(--surface2)',
                        border: `1px solid ${postType === pt ? '#4f7fff' : '#2a2d3e'}`,
                        borderRadius: 5, padding: '0.25rem 0.6rem', cursor: 'pointer',
                        color: postType === pt ? '#4f7fff' : 'var(--text3)', fontSize: '0.72rem', fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Write your post or use AI to generate one..."
                rows={5}
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid #2a2d3e',
                  borderRadius: 8, color: 'var(--text1)', fontSize: '0.85rem', padding: '0.75rem',
                  resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
                }}
              />

              {/* AI Generate shortcuts */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text3)', fontSize: '0.75rem', lineHeight: '28px', marginRight: 4 }}>
                  AI Generate:
                </span>
                {POST_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => generatePost(t.prompt)}
                    disabled={generating}
                    style={{
                      background: 'var(--surface2)', border: '1px solid #2a2d3e',
                      borderRadius: 14, padding: '0.25rem 0.65rem', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: '0.72rem', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}
                  >
                    <Sparkles size={10} color="#8b5cf6" /> {t.label}
                  </button>
                ))}
              </div>

              {generating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                  <Loader2 size={14} className="animate-spin" />
                  Generating AI content...
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setComposing(false); setPostContent('') }}
                  style={{
                    background: 'var(--surface2)', border: '1px solid #2a2d3e',
                    borderRadius: 7, padding: '0.5rem 0.9rem', cursor: 'pointer',
                    color: 'var(--text2)', fontSize: '0.82rem', fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={schedulePost}
                  disabled={!postContent.trim()}
                  style={{
                    background: postContent.trim() ? 'linear-gradient(135deg, #4f7fff, #7c5cfc)' : 'var(--surface2)',
                    color: postContent.trim() ? '#fff' : 'var(--text3)',
                    border: 'none', borderRadius: 7, padding: '0.5rem 1rem', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}
                >
                  <Send size={13} /> Schedule Post
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--surface2)',
                borderRadius: 10, padding: '1rem', cursor: 'pointer', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: 'var(--text3)', fontSize: '0.85rem',
              }}
            >
              <Plus size={15} /> Compose a new post...
            </button>
          )}

          {/* Scheduled/published posts */}
          {posts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {posts.map(p => (
                <div key={p.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--surface2)',
                  borderRadius: 10, padding: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.68rem', fontWeight: 600,
                      textTransform: 'capitalize',
                      background: p.status === 'published' ? '#22c07a18' : p.status === 'scheduled' ? '#f59e0b18' : '#5a608018',
                      color: p.status === 'published' ? '#22c07a' : p.status === 'scheduled' ? '#f59e0b' : '#5a6080',
                    }}>
                      {p.status}
                    </span>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.68rem', fontWeight: 500,
                      background: 'var(--surface2)', color: 'var(--text3)', textTransform: 'capitalize',
                    }}>
                      {p.post_type}
                    </span>
                    <span style={{ color: 'var(--text3)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {new Date(p.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text2)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {p.content.length > 200 ? p.content.slice(0, 200) + '...' : p.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
              <MessageSquare size={36} style={{ marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>No posts yet</div>
              <div style={{ fontSize: '0.78rem' }}>Create your first GMB post above</div>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Profile Views',  value: '1,247',  change: '+12%', icon: Eye,       color: '#4f7fff' },
              { label: 'Search Queries',  value: '892',    change: '+8%',  icon: TrendingUp,color: '#22c07a' },
              { label: 'Calls',           value: '67',     change: '+15%', icon: Phone,     color: '#f59e0b' },
              { label: 'Direction Reqs',  value: '134',    change: '+22%', icon: Navigation,color: '#8b5cf6' },
              { label: 'Website Clicks',  value: '456',    change: '+5%',  icon: Globe,     color: '#22d3ee' },
              { label: 'Photo Views',     value: '2,341',  change: '+18%', icon: ImageIcon, color: '#f25a5a' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', border: '1px solid var(--surface2)',
                borderRadius: 10, padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <s.icon size={16} color={s.color} />
                  <span style={{ color: '#22c07a', fontSize: '0.72rem', fontWeight: 600 }}>{s.change}</span>
                </div>
                <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: '1.3rem', fontFamily: '"JetBrains Mono", monospace' }}>
                  {s.value}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: '0.72rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top search queries */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '1.25rem' }}>
            <h3 style={{ color: 'var(--text1)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Top Search Queries
            </h3>
            {[
              { query: 'vehicle wrap near me', views: 312, clicks: 89 },
              { query: 'truck wrap gig harbor', views: 187, clicks: 54 },
              { query: 'fleet wraps tacoma wa', views: 145, clicks: 41 },
              { query: 'boat wrap washington', views: 98, clicks: 27 },
              { query: 'commercial van wrap', views: 87, clicks: 23 },
            ].map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0', borderBottom: i < 4 ? '1px solid var(--surface2)' : 'none',
              }}>
                <span style={{ color: 'var(--text3)', fontSize: '0.75rem', fontWeight: 700, width: 20 }}>{i + 1}.</span>
                <span style={{ flex: 1, color: 'var(--text1)', fontSize: '0.82rem' }}>{q.query}</span>
                <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>{q.views} views</span>
                <span style={{ color: '#4f7fff', fontSize: '0.75rem', fontWeight: 600 }}>{q.clicks} clicks</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
