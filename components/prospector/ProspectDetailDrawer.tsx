'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import type { Prospect, ProspectInteraction, TeamMember } from './ProspectorApp'
import {
  X, Phone, Mail, MessageSquare, Navigation, Star, ExternalLink,
  Truck, Clock, Calendar, ChevronDown, ChevronUp, Globe, MapPin,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  uncontacted: '#4f7fff', contacted: '#f59e0b', interested: '#22c07a',
  quoted: '#8b5cf6', won: '#ffd700', lost: '#505a6b', not_interested: '#505a6b', follow_up: '#22d3ee',
}

const STATUS_FLOW = ['uncontacted', 'contacted', 'interested', 'quoted', 'won']
const INTERACTION_TYPES = ['call', 'visit', 'email', 'sms', 'note', 'quote_sent', 'follow_up']
const OUTCOME_OPTIONS = ['no_answer', 'left_voicemail', 'spoke_with_owner', 'not_interested', 'interested', 'callback_scheduled', 'quote_requested', 'won']

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 12, outline: 'none',
}

interface Props {
  prospect: Prospect
  profile: Profile
  team: TeamMember[]
  isMobile: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<void>
  supabase: SupabaseClient
}

export function ProspectDetailDrawer({ prospect, profile, team, isMobile, onClose, onUpdate, supabase }: Props) {
  const [interactions, setInteractions] = useState<ProspectInteraction[]>([])
  const [showReasoning, setShowReasoning] = useState(false)
  const [showPitch, setShowPitch] = useState(false)
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [editNotes, setEditNotes] = useState(prospect.notes || '')
  const [editContactName, setEditContactName] = useState(prospect.contact_name || '')
  const [editContactTitle, setEditContactTitle] = useState(prospect.contact_title || '')
  const [editEmail, setEditEmail] = useState(prospect.email || '')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [intType, setIntType] = useState('call')
  const [intOutcome, setIntOutcome] = useState('')
  const [intNotes, setIntNotes] = useState('')
  const [intNextAction, setIntNextAction] = useState('')
  const [intNextDate, setIntNextDate] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('prospect_interactions')
          .select('*, user:user_id(name)')
          .eq('prospect_id', prospect.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (data) setInteractions(data)
      } catch { /* table may not exist yet */ }
    })()
  }, [prospect.id, supabase])

  const scoreColor = prospect.ai_score >= 70 ? '#22c07a' : prospect.ai_score >= 40 ? '#f59e0b' : '#f25a5a'

  const saveContactInfo = useCallback(async () => {
    await onUpdate(prospect.id, {
      contact_name: editContactName, contact_title: editContactTitle, email: editEmail, notes: editNotes,
    })
  }, [prospect.id, editContactName, editContactTitle, editEmail, editNotes, onUpdate])

  const addInteraction = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('prospect_interactions').insert({
        prospect_id: prospect.id, user_id: profile.id, interaction_type: intType,
        outcome: intOutcome || null, notes: intNotes || null,
        next_action: intNextAction || null, next_action_date: intNextDate || null,
      }).select('*, user:user_id(name)').single()
      if (!error && data) {
        setInteractions(prev => [data, ...prev])
        await onUpdate(prospect.id, {
          status: prospect.status === 'uncontacted' ? 'contacted' : prospect.status,
          last_contacted_at: new Date().toISOString(),
        })
        setShowAddInteraction(false)
        setIntType('call'); setIntOutcome(''); setIntNotes(''); setIntNextAction(''); setIntNextDate('')
      }
    } catch { /* handled */ }
  }, [supabase, prospect.id, prospect.status, profile.id, intType, intOutcome, intNotes, intNextAction, intNextDate, onUpdate])

  const convertToCustomer = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('customers').insert({
        org_id: prospect.org_id, name: prospect.business_name, email: prospect.email,
        phone: prospect.phone, address: prospect.address, city: prospect.city, state: prospect.state, zip: prospect.zip,
      }).select().single()
      if (!error && data) {
        await onUpdate(prospect.id, { status: 'won' })
      }
    } catch { /* handled */ }
  }, [supabase, prospect, onUpdate])

  return (
    <div style={{
      position: 'absolute',
      top: isMobile ? 'auto' : 0, right: 0, bottom: 0, left: isMobile ? 0 : 'auto',
      width: isMobile ? '100%' : 420, height: isMobile ? '75vh' : '100%',
      background: 'rgba(13,15,20,0.97)', backdropFilter: 'blur(20px)',
      borderLeft: isMobile ? 'none' : '1px solid var(--border)',
      borderTop: isMobile ? '1px solid var(--border)' : 'none',
      borderRadius: isMobile ? '16px 16px 0 0' : 0,
      zIndex: 15, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
    }}>
      {/* Header */}
      <div style={{
        padding: 16, borderBottom: '1px solid var(--border)', flexShrink: 0,
        borderLeft: `4px solid ${prospect.priority === 'hot' ? '#f25a5a' : prospect.priority === 'high' ? '#f59e0b' : 'var(--accent)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
              {prospect.business_name}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {prospect.business_type && (
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(79,127,255,0.1)', color: 'var(--accent)' }}>
                  {prospect.business_type}
                </span>
              )}
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                background: (STATUS_COLORS[prospect.status] || '#555') + '22', color: STATUS_COLORS[prospect.status] || '#999',
              }}>{prospect.status.replace('_', ' ')}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* AI Score */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 10px',
            background: `conic-gradient(${scoreColor} ${prospect.ai_score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, fontFamily: 'JetBrains Mono, monospace' }}>{prospect.ai_score}</div>
              <div style={{ fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>score</div>
            </div>
          </div>
          {prospect.ai_score_reasoning && (
            <div>
              <button onClick={() => setShowReasoning(!showReasoning)} style={{
                background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto',
              }}>Why this score? {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
              {showReasoning && (
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, textAlign: 'left', lineHeight: 1.5 }}>
                  {prospect.ai_score_reasoning}
                </div>
              )}
            </div>
          )}
          {prospect.ai_suggested_pitch && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowPitch(!showPitch)} style={{
                background: 'none', border: 'none', color: '#22d3ee', fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto',
              }}>Suggested Pitch {showPitch ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
              {showPitch && (
                <div style={{ fontSize: 11, color: '#22d3ee', fontStyle: 'italic', marginTop: 6, textAlign: 'left', lineHeight: 1.5 }}>
                  {prospect.ai_suggested_pitch}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {prospect.phone && (
            <a href={`tel:${prospect.phone}`} style={{
              padding: '6px 10px', borderRadius: 6, background: 'rgba(34,192,122,0.12)', color: '#22c07a',
              textDecoration: 'none', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}><Phone size={12} /> Call</a>
          )}
          {prospect.phone && (
            <a href={`sms:${prospect.phone}`} style={{
              padding: '6px 10px', borderRadius: 6, background: 'rgba(34,211,238,0.12)', color: '#22d3ee',
              textDecoration: 'none', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}><MessageSquare size={12} /> Text</a>
          )}
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} style={{
              padding: '6px 10px', borderRadius: 6, background: 'rgba(79,127,255,0.12)', color: 'var(--accent)',
              textDecoration: 'none', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}><Mail size={12} /> Email</a>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(prospect.address || prospect.business_name)}`}
            target="_blank" rel="noopener noreferrer" style={{
              padding: '6px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
              textDecoration: 'none', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}><Navigation size={12} /> Directions</a>
          <button onClick={convertToCustomer} style={{
            padding: '6px 10px', borderRadius: 6, background: 'rgba(255,215,0,0.12)', color: '#ffd700',
            border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}><Star size={12} /> Convert</button>
        </div>

        {/* Business Info */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <SectionHeader label="Business Info" />
          {prospect.address && <InfoRow icon={<MapPin size={12} />} label="Address"
            value={`${prospect.address}${prospect.city ? `, ${prospect.city}` : ''}${prospect.state ? ` ${prospect.state}` : ''}${prospect.zip ? ` ${prospect.zip}` : ''}`}
            link={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospect.address)}`} />}
          {prospect.phone && <InfoRow icon={<Phone size={12} />} label="Phone" value={prospect.phone} link={`tel:${prospect.phone}`} />}
          {prospect.website && <InfoRow icon={<Globe size={12} />} label="Website" value={prospect.website} link={prospect.website} />}
          {prospect.google_rating != null && (
            <InfoRow icon={<Star size={12} />} label="Rating" value={`${prospect.google_rating} (${prospect.google_review_count || 0} reviews)`} />
          )}
        </div>

        {/* Contact (editable) */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <SectionHeader label="Contact" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={editContactName} onChange={e => setEditContactName(e.target.value)} onBlur={saveContactInfo}
              placeholder="Contact name..." style={inputStyle} />
            <input value={editContactTitle} onChange={e => setEditContactTitle(e.target.value)} onBlur={saveContactInfo}
              placeholder="Title..." style={inputStyle} />
            <input value={editEmail} onChange={e => setEditEmail(e.target.value)} onBlur={saveContactInfo}
              placeholder="Email..." style={inputStyle} />
          </div>
        </div>

        {/* Fleet */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <SectionHeader label="Fleet Estimate" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Truck size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
              {prospect.estimated_fleet_size}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>vehicles</span>
          </div>
          {prospect.estimated_vehicle_types && prospect.estimated_vehicle_types.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {prospect.estimated_vehicle_types.map(t => (
                <span key={t} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text2)' }}>{t}</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, fontStyle: 'italic' }}>AI estimate — update after visit</div>
        </div>

        {/* Notes */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <SectionHeader label="Notes" />
          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} onBlur={saveContactInfo}
            placeholder="Add notes..." rows={3} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
        </div>

        {/* Follow Up */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {prospect.next_follow_up_at && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} /> Follow up: {new Date(prospect.next_follow_up_at).toLocaleDateString()}
            </div>
          )}
          {showFollowUp ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} style={{ flex: 1, ...inputStyle }} />
              <button onClick={async () => {
                if (followUpDate) { await onUpdate(prospect.id, { next_follow_up_at: new Date(followUpDate).toISOString() }); setShowFollowUp(false) }
              }} style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Set</button>
            </div>
          ) : (
            <button onClick={() => setShowFollowUp(true)} style={{
              padding: '6px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
              border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}><Calendar size={12} /> Schedule Follow Up</button>
          )}
        </div>

        {/* Interactions */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionHeader label={`Interactions (${interactions.length})`} />
            <button onClick={() => setShowAddInteraction(!showAddInteraction)} style={{
              padding: '4px 10px', borderRadius: 6, background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
              border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>+ Log</button>
          </div>

          {showAddInteraction && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {INTERACTION_TYPES.map(t => (
                  <button key={t} onClick={() => setIntType(t)} style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', textTransform: 'capitalize',
                    background: intType === t ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                    color: intType === t ? 'var(--accent)' : 'var(--text3)',
                    border: intType === t ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                  }}>{t.replace('_', ' ')}</button>
                ))}
              </div>
              <select value={intOutcome} onChange={e => setIntOutcome(e.target.value)}
                style={{ width: '100%', marginBottom: 6, ...inputStyle }}>
                <option value="">Outcome...</option>
                {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
              </select>
              <textarea value={intNotes} onChange={e => setIntNotes(e.target.value)}
                placeholder="Notes..." rows={2} style={{ width: '100%', marginBottom: 6, resize: 'none', ...inputStyle }} />
              <input value={intNextAction} onChange={e => setIntNextAction(e.target.value)}
                placeholder="Next action..." style={{ width: '100%', marginBottom: 6, ...inputStyle }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="date" value={intNextDate} onChange={e => setIntNextDate(e.target.value)} style={{ flex: 1, ...inputStyle }} />
                <button onClick={addInteraction} style={{
                  padding: '6px 14px', borderRadius: 6, background: 'var(--accent)', color: '#fff',
                  border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Save</button>
              </div>
            </div>
          )}

          {interactions.map(int => (
            <div key={int.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: 'rgba(79,127,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
              }}>
                {int.interaction_type === 'call' && <Phone size={10} style={{ color: 'var(--accent)' }} />}
                {int.interaction_type === 'visit' && <MapPin size={10} style={{ color: '#22c07a' }} />}
                {int.interaction_type === 'email' && <Mail size={10} style={{ color: '#f59e0b' }} />}
                {int.interaction_type === 'sms' && <MessageSquare size={10} style={{ color: '#22d3ee' }} />}
                {!['call', 'visit', 'email', 'sms'].includes(int.interaction_type) && <Clock size={10} style={{ color: 'var(--text3)' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', textTransform: 'capitalize' }}>{int.interaction_type.replace('_', ' ')}</span>
                  {int.outcome && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: 'var(--text3)', textTransform: 'capitalize' }}>
                      {int.outcome.replace('_', ' ')}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{new Date(int.created_at).toLocaleDateString()}</span>
                </div>
                {int.notes && <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{int.notes}</div>}
              </div>
            </div>
          ))}
          {interactions.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 11 }}>No interactions yet</div>}
        </div>
      </div>

      {/* Status Stepper */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
          {STATUS_FLOW.map((s, i) => {
            const current = STATUS_FLOW.indexOf(prospect.status)
            const isActive = i <= current
            const isCurrent = prospect.status === s
            return (
              <button key={s} onClick={() => onUpdate(prospect.id, { status: s })} style={{
                flex: 1, padding: '6px 2px', borderRadius: 4, fontSize: 9, fontWeight: isCurrent ? 700 : 500,
                color: isActive ? '#fff' : 'var(--text3)',
                background: isActive ? (STATUS_COLORS[s] || 'var(--accent)') : 'rgba(255,255,255,0.04)',
                border: isCurrent ? `1px solid ${STATUS_COLORS[s]}` : '1px solid transparent',
                cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
              }}>{s.replace('_', ' ')}</button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onUpdate(prospect.id, { status: 'lost' })} style={{
            flex: 1, padding: 4, borderRadius: 4, fontSize: 9, cursor: 'pointer', border: 'none',
            background: prospect.status === 'lost' ? 'rgba(242,90,90,0.2)' : 'rgba(255,255,255,0.03)',
            color: prospect.status === 'lost' ? '#f25a5a' : 'var(--text3)',
          }}>Lost</button>
          <button onClick={() => onUpdate(prospect.id, { status: 'not_interested' })} style={{
            flex: 1, padding: 4, borderRadius: 4, fontSize: 9, cursor: 'pointer', border: 'none',
            background: prospect.status === 'not_interested' ? 'rgba(80,90,107,0.3)' : 'rgba(255,255,255,0.03)',
            color: prospect.status === 'not_interested' ? '#aaa' : 'var(--text3)',
          }}>Not Interested</button>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
    </div>
  )
}

function InfoRow({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string; link?: string }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{ color: 'var(--text3)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</div>
        <div style={{ fontSize: 12, color: link ? 'var(--accent)' : 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
      {link && <ExternalLink size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
    </div>
  )
  return link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{content}</a> : content
}
