'use client'

import { useState } from 'react'
import type { Profile } from '@/types'
import {
  Lightbulb, Sparkles, TrendingUp, DollarSign, Target, Users,
  BarChart3, ArrowRight, Loader2, MapPin, Building2, Zap, ChevronDown,
  ChevronRight, Star, AlertCircle,
} from 'lucide-react'

interface BusinessIdea {
  id: string
  name: string
  category: string
  description: string
  market_size: string
  startup_cost: string
  monthly_revenue: string
  competition: 'low' | 'medium' | 'high'
  difficulty: 'easy' | 'medium' | 'hard'
  synergy: string
  steps: string[]
  score: number
}

const DEMO_IDEAS: BusinessIdea[] = [
  {
    id: 'vi-1', name: 'Mobile Vinyl Wrap Service', category: 'Vehicle Services',
    description: 'On-site vehicle wrap installation for dealerships and fleet managers. Drive to their location with a portable clean room setup.',
    market_size: '$2.8B by 2028', startup_cost: '$15,000 - $25,000', monthly_revenue: '$8,000 - $15,000',
    competition: 'low', difficulty: 'medium', synergy: 'Direct extension of current business. Use existing equipment, just add mobile setup.',
    steps: ['Purchase enclosed trailer + portable lighting', 'Partner with 3 local dealerships', 'Offer 10% discount for on-site vs in-shop', 'Market to fleet managers on LinkedIn'],
    score: 95,
  },
  {
    id: 'vi-2', name: 'Wrap Training Academy', category: 'Education',
    description: 'Teach vehicle wrapping skills through weekend workshops and online courses. Certification program for aspiring installers.',
    market_size: '$500M trade education', startup_cost: '$5,000 - $10,000', monthly_revenue: '$4,000 - $8,000',
    competition: 'low', difficulty: 'easy', synergy: 'Monetize expertise. Creates pipeline for hiring trained installers.',
    steps: ['Film 10 tutorial modules', 'Launch weekend workshops ($500/person)', 'Create certification with printed certificates', 'Partner with vinyl suppliers for student discounts'],
    score: 88,
  },
  {
    id: 'vi-3', name: 'AI-Powered Design Service', category: 'Tech Services',
    description: 'Offer AI-generated wrap designs to other wrap shops nationwide. White-label design service with 24-hour turnaround.',
    market_size: '$1.2B design services', startup_cost: '$3,000 - $8,000', monthly_revenue: '$6,000 - $12,000',
    competition: 'medium', difficulty: 'medium', synergy: 'Leverage existing design team + AI tools. No physical product needed.',
    steps: ['Build design request portal', 'Train AI on 1000+ previous designs', 'Price at $200-500 per design', 'Target 50 wrap shops as clients'],
    score: 82,
  },
  {
    id: 'vi-4', name: 'Vinyl Remnant Marketplace', category: 'E-Commerce',
    description: 'Online marketplace for leftover vinyl material. Connect wrap shops with buyers who need small quantities for small projects.',
    market_size: '$800M vinyl waste', startup_cost: '$2,000 - $5,000', monthly_revenue: '$2,000 - $5,000',
    competition: 'low', difficulty: 'easy', synergy: 'Monetize waste material. Already have inventory tracking.',
    steps: ['List remnants on existing website', 'Add shipping calculator', 'Partner with 10 local shops for inventory', 'Market to DIY community on social media'],
    score: 75,
  },
  {
    id: 'vi-5', name: 'Commercial Signage Division', category: 'Expansion',
    description: 'Expand into commercial signage: storefront graphics, window tinting, wall murals, and floor graphics for businesses.',
    market_size: '$45B signage market', startup_cost: '$20,000 - $40,000', monthly_revenue: '$10,000 - $25,000',
    competition: 'high', difficulty: 'hard', synergy: 'Same equipment, different application. Cross-sell to existing customers.',
    steps: ['Hire signage specialist', 'Add flatbed printer for rigid substrates', 'Target commercial property managers', 'Bundle with vehicle wraps for business packages'],
    score: 70,
  },
]

interface Props { profile: Profile }

export default function VenturesClient({ profile }: Props) {
  const [ideas, setIdeas] = useState<BusinessIdea[]>(DEMO_IDEAS)
  const [generating, setGenerating] = useState(false)
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')

  const c = {
    bg: '#0d0f14', surface: '#161920', surface2: '#1a1d27',
    border: '#1e2330', accent: '#4f7fff', green: '#22c07a',
    amber: '#f59e0b', red: '#f25a5a', purple: '#8b5cf6',
    cyan: '#22d3ee', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  }

  const competitionColors = { low: c.green, medium: c.amber, high: c.red }
  const difficultyColors = { easy: c.green, medium: c.amber, hard: c.red }

  async function generateIdeas() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-ventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt || 'Generate business ideas for a vehicle wrap company in Seattle' }),
      })
      const data = await res.json()
      if (data.ideas) setIdeas(data.ideas)
    } catch {}
    setGenerating(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={20} style={{ color: c.amber }} />
          <h1 style={{ fontSize: 22, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: 0 }}>
            Business Ventures
          </h1>
        </div>
      </div>

      {/* AI Generation Bar */}
      <div style={{ background: c.surface, borderRadius: 12, border: `1px solid ${c.border}`, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Sparkles size={16} style={{ color: c.purple }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.purple }}>AI Business Idea Generator</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
            placeholder="e.g., Low-cost ideas under $5k, or ideas leveraging AI, or fleet-focused services..."
            style={{ flex: 1, padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 13, outline: 'none' }}
          />
          <button onClick={generateIdeas} disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${c.purple}, ${c.accent})`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {generating ? <><Loader2 size={14} className="spin" /> Generating...</> : <><Sparkles size={14} /> Generate Ideas</>}
          </button>
        </div>
      </div>

      {/* Ideas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 12 }}>
        {ideas.map(idea => {
          const isExpanded = expandedIdea === idea.id
          const scoreColor = idea.score >= 80 ? c.green : idea.score >= 60 ? c.amber : c.red

          return (
            <div key={idea.id} style={{ background: c.surface, borderRadius: 12, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
              {/* Card Header */}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{idea.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: `${c.accent}15`, color: c.accent, border: `1px solid ${c.accent}25` }}>{idea.category}</span>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: `${competitionColors[idea.competition]}10`, color: competitionColors[idea.competition], border: `1px solid ${competitionColors[idea.competition]}25` }}>
                        {idea.competition} competition
                      </span>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: `${difficultyColors[idea.difficulty]}10`, color: difficultyColors[idea.difficulty], border: `1px solid ${difficultyColors[idea.difficulty]}25` }}>
                        {idea.difficulty}
                      </span>
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ width: 52, height: 52, minWidth: 52, borderRadius: 12, background: `${scoreColor}10`, border: `2px solid ${scoreColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{idea.score}</span>
                    <span style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', color: scoreColor, letterSpacing: '0.1em' }}>SCORE</span>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.5, margin: '0 0 12px' }}>{idea.description}</p>

                {/* Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Market Size', value: idea.market_size, icon: <TrendingUp size={12} />, color: c.accent },
                    { label: 'Startup Cost', value: idea.startup_cost, icon: <DollarSign size={12} />, color: c.amber },
                    { label: 'Monthly Rev', value: idea.monthly_revenue, icon: <BarChart3 size={12} />, color: c.green },
                  ].map(m => (
                    <div key={m.label} style={{ padding: '8px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <span style={{ color: m.color }}>{m.icon}</span>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text3, fontWeight: 600 }}>{m.label}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: c.text1 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expand for details */}
              <button onClick={() => setExpandedIdea(isExpanded ? null : idea.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${c.border}`, background: `${c.accent}05`, border: 'none', color: c.accent, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <span>{isExpanded ? 'Hide Details' : 'View Action Plan'}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${c.border}` }}>
                  {/* Synergy */}
                  <div style={{ padding: '10px 0', borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.text3, fontWeight: 600, marginBottom: 4 }}>Synergy with Current Business</div>
                    <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{idea.synergy}</div>
                  </div>

                  {/* Action Steps */}
                  <div style={{ paddingTop: 10 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.text3, fontWeight: 600, marginBottom: 8 }}>Action Steps</div>
                    {idea.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 20, height: 20, minWidth: 20, borderRadius: '50%', background: `${c.accent}15`, color: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>
                        <span style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
