'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2, AlertCircle, Camera, Flag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SharedPhoto {
  id: string
  public_url: string
  markup_url: string | null
  angle: string | null
  category: string | null
  caption: string | null
  concern_type: string | null
  is_flagged: boolean
  file_name: string | null
  created_at: string
  share_token: string
  estimate_survey_vehicles: {
    vehicle_year: string | null
    vehicle_make: string | null
    vehicle_model: string | null
  } | null
}

const CONCERN_COLOR: Record<string, string> = {
  rust:           '#f59e0b',
  dent:           '#f25a5a',
  scratch:        '#facc15',
  existing_vinyl: '#4f7fff',
  other:          '#9299b5',
}

const ANGLE_LABEL: Record<string, string> = {
  front:          'Front',
  driver_side:    'Driver Side',
  passenger_side: 'Passenger Side',
  rear:           'Rear',
  detail:         'Detail',
  existing_vinyl: 'Existing Vinyl',
}

export default function PhotoShareClient({ token }: { token: string }) {
  const [photo, setPhoto] = useState<SharedPhoto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    fetch(`/api/photos/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setPhoto)
      .catch(() => setError('Photo not found or link is invalid.'))
      .finally(() => setLoading(false))
  }, [token])

  const displayUrl = (showOriginal || !photo?.markup_url) ? photo?.public_url : photo?.markup_url

  const handleDownload = () => {
    if (!displayUrl) return
    const a = document.createElement('a')
    a.href = displayUrl
    a.download = photo?.file_name || 'photo.jpg'
    a.target = '_blank'
    a.click()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0f14' }}>
      <Loader2 size={32} style={{ color: '#4f7fff', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !photo) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0f14', padding: 24 }}>
      <AlertCircle size={48} style={{ color: '#f25a5a', marginBottom: 16 }} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e8eaed', marginBottom: 8 }}>Photo Not Found</h1>
      <p style={{ color: '#9299b5', fontSize: 14 }}>{error}</p>
    </div>
  )

  const vehicle = photo.estimate_survey_vehicles
  const vehicleLabel = vehicle
    ? [vehicle.vehicle_year, vehicle.vehicle_make, vehicle.vehicle_model].filter(Boolean).join(' ')
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: '#13151c', borderBottom: '1px solid #1a1d27',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={18} style={{ color: '#4f7fff' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {vehicleLabel || 'Survey Photo'}
            </div>
            {photo.angle && (
              <div style={{ fontSize: 11, color: '#9299b5' }}>
                {ANGLE_LABEL[photo.angle] || photo.angle}
                {photo.caption && ` · ${photo.caption}`}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {photo.markup_url && (
            <button
              onClick={() => setShowOriginal(s => !s)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #2a2d3a',
                background: showOriginal ? 'rgba(245,158,11,0.1)' : 'rgba(34,192,122,0.1)',
                color: showOriginal ? '#f59e0b' : '#22c07a',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
              }}
            >
              {showOriginal ? 'Show Markup' : 'Original'}
            </button>
          )}
          <button
            onClick={handleDownload}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(79,127,255,0.3)',
              background: 'rgba(79,127,255,0.1)', color: '#4f7fff',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
            }}
          >
            <Download size={13} /> Download
          </button>
        </div>
      </div>

      {/* Photo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <img
          src={displayUrl}
          alt={photo.caption || photo.angle || 'survey photo'}
          style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 160px)', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        />
      </div>

      {/* Footer badges */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {photo.is_flagged && photo.concern_type && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20,
            background: `${CONCERN_COLOR[photo.concern_type] || '#9299b5'}22`,
            border: `1px solid ${CONCERN_COLOR[photo.concern_type] || '#9299b5'}44`,
            color: CONCERN_COLOR[photo.concern_type] || '#9299b5',
            fontSize: 11, fontWeight: 700,
          }}>
            <Flag size={11} />
            {photo.concern_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        )}
        {photo.markup_url && (
          <div style={{
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.2)',
            color: '#22c07a', fontSize: 11, fontWeight: 700,
          }}>
            Markup Available
          </div>
        )}
        <div style={{ color: '#5a6080', fontSize: 11 }}>
          {new Date(photo.created_at).toLocaleDateString()}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 16px 16px', color: '#5a6080', fontSize: 11 }}>
        USA WRAP CO · Shared via survey link
      </div>
    </div>
  )
}
