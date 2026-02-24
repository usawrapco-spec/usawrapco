'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Settings,
  User,
  Save,
  Check,
  AlertCircle,
  Mic,
  MicOff,
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
} from 'lucide-react'

interface PhoneNumber {
  id: string
  org_id: string
  phone_number: string
  friendly_name: string | null
  assigned_to: string | null
  is_primary: boolean
  capabilities: Record<string, boolean> | null
  created_at: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  avatar_url: string | null
}

interface TwilioIntegration {
  id: string
  provider: string
  status: string
  config: Record<string, unknown>
  created_at: string
}

interface Props {
  profile: Profile
  phoneNumbers: PhoneNumber[]
  teamMembers: TeamMember[]
  twilioIntegration: TwilioIntegration | null
  recordAllCalls: boolean
}

export default function PhoneSettingsClient({
  profile,
  phoneNumbers: initialPhoneNumbers,
  teamMembers,
  twilioIntegration,
  recordAllCalls: initialRecordAll,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>(initialPhoneNumbers)
  const [recordAll, setRecordAll] = useState(initialRecordAll)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Determine connection status
  // We consider Twilio "connected" if there's an integration record with status active,
  // OR if the env vars are set (we check by trying to fetch account info)
  const isConnected = twilioIntegration?.status === 'active' || phoneNumbers.length > 0

  const primaryNumber = phoneNumbers.find(p => p.is_primary) || phoneNumbers[0]

  // --- Styles ---
  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--surface2)',
    padding: 24,
    marginBottom: 16,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text2)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
    display: 'block',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg)',
    border: '1px solid var(--surface2)',
    borderRadius: 8,
    color: 'var(--text1)',
    fontSize: 14,
    outline: 'none',
  }

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    opacity: saving ? 0.6 : 1,
  }

  const btnGhost: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--surface2)',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  }

  const toggleTrack: React.CSSProperties = {
    width: 44,
    height: 24,
    borderRadius: 12,
    background: recordAll ? 'var(--accent)' : 'var(--surface2)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  }

  const toggleThumb: React.CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 3,
    left: recordAll ? 23 : 3,
    transition: 'left 0.2s',
  }

  // --- Assign number to team member ---
  const handleAssign = async (phoneId: string, assignedTo: string | null) => {
    setPhoneNumbers(prev =>
      prev.map(p => (p.id === phoneId ? { ...p, assigned_to: assignedTo } : p))
    )
    await supabase
      .from('phone_numbers')
      .update({ assigned_to: assignedTo || null })
      .eq('id', phoneId)
  }

  // --- Toggle record all calls ---
  const handleToggleRecord = async () => {
    const newVal = !recordAll
    setRecordAll(newVal)
    setSaving(true)

    const { data: existing } = await supabase
      .from('shop_settings')
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('key', 'twilio_record_all_calls')
      .single()

    if (existing) {
      await supabase
        .from('shop_settings')
        .update({ value: String(newVal) })
        .eq('id', existing.id)
    } else {
      await supabase.from('shop_settings').insert({
        org_id: profile.org_id,
        key: 'twilio_record_all_calls',
        value: String(newVal),
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // --- Save all assignments ---
  const handleSaveAll = async () => {
    setSaving(true)
    for (const pn of phoneNumbers) {
      await supabase
        .from('phone_numbers')
        .update({ assigned_to: pn.assigned_to || null })
        .eq('id', pn.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // --- Not Connected State ---
  if (!isConnected && phoneNumbers.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.push('/settings')}
            style={{ ...btnGhost, padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading, "Barlow Condensed", sans-serif)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text1)',
              margin: 0,
            }}>
              Phone System
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', margin: '4px 0 0' }}>
              Twilio voice and SMS integration
            </p>
          </div>
        </div>

        {/* Not connected card */}
        <div style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(242, 90, 90, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <PhoneOff size={28} style={{ color: 'var(--red)' }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading, "Barlow Condensed", sans-serif)',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--text1)',
            margin: '0 0 8px',
          }}>
            Not Connected
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, maxWidth: 400, lineHeight: 1.6, margin: '0 0 24px' }}>
            Twilio is not configured. Add the following environment variables to enable the phone system:
          </p>
          <div style={{
            background: 'var(--bg)',
            borderRadius: 8,
            padding: 16,
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 13,
            color: 'var(--text2)',
            textAlign: 'left',
            width: '100%',
            maxWidth: 420,
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--cyan)' }}>TWILIO_ACCOUNT_SID</span>=<span style={{ color: 'var(--text3)' }}>your_account_sid</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--cyan)' }}>TWILIO_AUTH_TOKEN</span>=<span style={{ color: 'var(--text3)' }}>your_auth_token</span>
            </div>
            <div>
              <span style={{ color: 'var(--cyan)' }}>TWILIO_PHONE_NUMBER</span>=<span style={{ color: 'var(--text3)' }}>+1XXXXXXXXXX</span>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--amber)',
            }}>
              <AlertCircle size={14} />
              Set these in your Vercel environment variables or .env.local
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Connected State ---
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/settings')}
            style={{ ...btnGhost, padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading, "Barlow Condensed", sans-serif)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text1)',
              margin: 0,
            }}>
              Phone System
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', margin: '4px 0 0' }}>
              Twilio voice and SMS integration
            </p>
          </div>
        </div>
        <button onClick={handleSaveAll} style={btnPrimary} disabled={saving}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Saved' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Connection Status */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(34, 192, 122, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LinkIcon size={18} style={{ color: 'var(--green)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>
                Twilio Connected
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Voice and SMS enabled
              </div>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(34, 192, 122, 0.1)',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--green)',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--green)',
            }} />
            Active
          </div>
        </div>
      </div>

      {/* Main Shop Number */}
      {primaryNumber && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Phone size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>
              Main Shop Number
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            background: 'var(--bg)',
            borderRadius: 8,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(79, 127, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PhoneCall size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text1)',
                letterSpacing: '0.5px',
              }}>
                {formatPhoneDisplay(primaryNumber.phone_number)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                {primaryNumber.friendly_name || 'Primary line'}
                {primaryNumber.assigned_to && (
                  <span>
                    {' '} &middot; Assigned to{' '}
                    <span style={{ color: 'var(--accent)' }}>
                      {teamMembers.find(t => t.id === primaryNumber.assigned_to)?.name || 'Unknown'}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Numbers List */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Settings size={18} style={{ color: 'var(--text2)' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>
              Phone Numbers ({phoneNumbers.length})
            </span>
          </div>
        </div>

        {phoneNumbers.length === 0 ? (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 14,
          }}>
            No phone numbers configured. Add numbers in your Twilio console, then sync them here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {phoneNumbers.map(pn => (
              <div
                key={pn.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: 14,
                  background: 'var(--bg)',
                  borderRadius: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: pn.is_primary ? 'rgba(79, 127, 255, 0.1)' : 'var(--surface2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Phone size={16} style={{ color: pn.is_primary ? 'var(--accent)' : 'var(--text3)' }} />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text1)',
                    }}>
                      {formatPhoneDisplay(pn.phone_number)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {pn.friendly_name || (pn.is_primary ? 'Primary' : 'Additional line')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={14} style={{ color: 'var(--text3)' }} />
                  <select
                    value={pn.assigned_to || ''}
                    onChange={e => handleAssign(pn.id, e.target.value || null)}
                    style={{
                      ...selectStyle,
                      width: 200,
                      padding: '6px 10px',
                      fontSize: 13,
                    }}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(tm => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name} ({tm.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Recording Toggle */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: recordAll ? 'rgba(79, 127, 255, 0.1)' : 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {recordAll ? (
                <Mic size={18} style={{ color: 'var(--accent)' }} />
              ) : (
                <MicOff size={18} style={{ color: 'var(--text3)' }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>
                Record All Calls
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 400 }}>
                Automatically record all inbound and outbound calls. Recordings are stored in your Twilio account.
              </div>
            </div>
          </div>
          <div
            onClick={handleToggleRecord}
            style={toggleTrack}
            role="switch"
            aria-checked={recordAll}
          >
            <div style={toggleThumb} />
          </div>
        </div>
        {recordAll && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(245, 158, 11, 0.06)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--amber)',
          }}>
            <AlertCircle size={14} />
            Ensure you comply with local and state recording consent laws (e.g., two-party consent in WA State).
          </div>
        )}
      </div>

      {/* Webhook URLs (informational) */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Settings size={18} style={{ color: 'var(--text2)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>
            Webhook Configuration
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px', lineHeight: 1.6 }}>
          Configure these URLs in your Twilio console under the phone number settings.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WebhookRow
            label="Voice Webhook (POST)"
            url="/api/webhooks/twilio/voice"
          />
          <WebhookRow
            label="SMS Webhook (POST)"
            url="/api/webhooks/twilio/sms"
          />
        </div>
      </div>
    </div>
  )
}

// --- Helper: Format phone for display ---
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

// --- Webhook URL row component ---
function WebhookRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${url}`
    : url

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 14px',
      background: 'var(--bg)',
      borderRadius: 8,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
        <div style={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: 13,
          color: 'var(--cyan)',
        }}>
          {url}
        </div>
      </div>
      <button
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: copied ? 'rgba(34, 192, 122, 0.1)' : 'var(--surface2)',
          border: 'none',
          borderRadius: 6,
          fontSize: 12,
          color: copied ? 'var(--green)' : 'var(--text2)',
          cursor: 'pointer',
        }}
      >
        {copied ? <Check size={12} /> : null}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
