'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Check,
  Car,
  AlertTriangle,
  Pencil,
  X,
  Upload,
  User,
  FileText,
} from 'lucide-react'
import VehicleSelector from '@/components/vehicle/VehicleSelector'
import type { VehicleEntry } from '@/components/vehicle/VehicleSelector'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VehicleCheckinProps {
  profile: { id: string; name: string; role: string; org_id: string }
  job: any
  jobId: string
}

interface DamageMarker {
  id: string
  x: number
  y: number
  type: 'scratch' | 'dent' | 'chip' | 'crack' | 'rust'
  notes: string
}

interface PhotoSlot {
  key: string
  label: string
  required: boolean
  file: File | null
  preview: string | null
  url: string | null
}

const DAMAGE_COLORS: Record<string, string> = {
  scratch: '#f59e0b',
  dent: '#f97316',
  chip: '#f25a5a',
  crack: '#8b5cf6',
  rust: '#92400e',
}

const DAMAGE_TYPES = ['scratch', 'dent', 'chip', 'crack', 'rust'] as const

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Box Truck', 'Boat', 'Truck'] as const

const STEP_LABELS = ['Vehicle Info', 'Exterior Condition', 'Photos', 'Notes', 'Signature']

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VehicleCheckinClient({ profile, job, jobId }: VehicleCheckinProps) {
  const router = useRouter()
  const supabase = createClient()

  /* ---------- step navigation ---------- */
  const [step, setStep] = useState(0)

  /* ---------- step 1: vehicle info ---------- */
  const [vin, setVin] = useState('')
  const [vinLoading, setVinLoading] = useState(false)
  const [vinError, setVinError] = useState('')
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [odometer, setOdometer] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleType, setVehicleType] = useState('')

  /* ---------- step 2: damage markers ---------- */
  const [markers, setMarkers] = useState<DamageMarker[]>([])
  const [editingMarker, setEditingMarker] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  /* ---------- step 3: photos ---------- */
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { key: 'front', label: 'Front', required: true, file: null, preview: null, url: null },
    { key: 'rear', label: 'Rear', required: true, file: null, preview: null, url: null },
    { key: 'driver', label: 'Driver Side', required: true, file: null, preview: null, url: null },
    { key: 'passenger', label: 'Passenger Side', required: true, file: null, preview: null, url: null },
    { key: 'roof', label: 'Roof', required: false, file: null, preview: null, url: null },
    { key: 'interior', label: 'Interior', required: false, file: null, preview: null, url: null },
    { key: 'damage', label: 'Damage Close-up', required: false, file: null, preview: null, url: null },
    { key: 'other', label: 'Other', required: false, file: null, preview: null, url: null },
  ])
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  /* ---------- step 4: notes ---------- */
  const [generalNotes, setGeneralNotes] = useState('')
  const [vehicleClean, setVehicleClean] = useState(false)
  const [damageAcknowledged, setDamageAcknowledged] = useState(false)

  /* ---------- step 5: signature ---------- */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPresent, setCustomerPresent] = useState(true)

  /* ---------- submission ---------- */
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  /* ================================================================ */
  /*  VIN Decode                                                       */
  /* ================================================================ */

  const decodeVin = async () => {
    if (vin.length < 11) {
      setVinError('VIN must be at least 11 characters')
      return
    }
    setVinLoading(true)
    setVinError('')
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`
      )
      const json = await res.json()
      const result = json.Results?.[0]
      if (result) {
        if (result.ModelYear && result.ModelYear !== '0') setYear(result.ModelYear)
        if (result.Make) setMake(result.Make)
        if (result.Model) setModel(result.Model)
        // Map body class to our vehicle types
        const bodyClass = (result.BodyClass || '').toLowerCase()
        if (bodyClass.includes('van')) setVehicleType('Van')
        else if (bodyClass.includes('truck') && bodyClass.includes('box')) setVehicleType('Box Truck')
        else if (bodyClass.includes('truck') || bodyClass.includes('pickup')) setVehicleType('Truck')
        else if (bodyClass.includes('suv') || bodyClass.includes('sport utility')) setVehicleType('SUV')
        else if (bodyClass.includes('sedan') || bodyClass.includes('coupe') || bodyClass.includes('hatchback')) setVehicleType('Sedan')
      } else {
        setVinError('No results found for this VIN')
      }
    } catch {
      setVinError('Failed to decode VIN. Check your connection.')
    }
    setVinLoading(false)
  }

  /* ================================================================ */
  /*  SVG click handler (damage markers)                               */
  /* ================================================================ */

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newMarker: DamageMarker = {
      id: `dmg-${Date.now()}`,
      x,
      y,
      type: 'scratch',
      notes: '',
    }
    setMarkers((prev) => [...prev, newMarker])
    setEditingMarker(newMarker.id)
  }

  const updateMarker = (id: string, updates: Partial<DamageMarker>) => {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
  }

  const removeMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id))
    if (editingMarker === id) setEditingMarker(null)
  }

  /* ================================================================ */
  /*  Photo handling                                                   */
  /* ================================================================ */

  const handlePhotoCapture = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPhotos((prev) =>
      prev.map((p) => (p.key === key ? { ...p, file, preview } : p))
    )
  }

  const clearPhoto = (key: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.key === key) {
          if (p.preview) URL.revokeObjectURL(p.preview)
          return { ...p, file: null, preview: null, url: null }
        }
        return p
      })
    )
  }

  /* ================================================================ */
  /*  Signature canvas                                                 */
  /* ================================================================ */

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Set actual resolution
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#e8eaed'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (step === 4) {
      // Small delay so canvas is in the DOM
      const t = setTimeout(initCanvas, 100)
      return () => clearTimeout(t)
    }
  }, [step, initCanvas])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSigned(true)
  }

  const endDraw = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  /* ================================================================ */
  /*  Submit                                                           */
  /* ================================================================ */

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')

    try {
      // 1. Upload photos
      const photoUrls: Record<string, string> = {}
      for (const slot of photos) {
        if (!slot.file) continue
        const ext = slot.file.name.split('.').pop() || 'jpg'
        const path = `${profile.org_id}/${jobId}/checkin/${slot.key}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('job-images')
          .upload(path, slot.file)
        if (upErr) {
          console.error('Photo upload error:', upErr)
          continue
        }
        const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path)
        photoUrls[slot.key] = urlData.publicUrl
      }

      // 2. Upload signature if present
      let signatureUrl: string | null = null
      if (customerPresent && hasSigned && canvasRef.current) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, 'image/png')
        )
        if (blob) {
          const sigPath = `${profile.org_id}/${jobId}/checkin/signature_${Date.now()}.png`
          const { error: sigErr } = await supabase.storage
            .from('job-images')
            .upload(sigPath, blob)
          if (!sigErr) {
            const { data: sigUrl } = supabase.storage.from('job-images').getPublicUrl(sigPath)
            signatureUrl = sigUrl.publicUrl
          }
        }
      }

      // 3. Insert vehicle check-in record
      const { error: insertErr } = await supabase.from('vehicle_checkins').insert({
        job_id: jobId,
        vin: vin || null,
        year: year || null,
        make: make || null,
        model: model || null,
        color: color || null,
        odometer: odometer ? parseInt(odometer, 10) : null,
        license_plate: licensePlate || null,
        vehicle_type: vehicleType || null,
        checked_in_by: profile.id,
        checked_in_at: new Date().toISOString(),
        damage_markers: markers,
        photos: photoUrls,
        general_notes: generalNotes || null,
        vehicle_clean: vehicleClean,
        damage_acknowledged: damageAcknowledged,
        customer_signature_url: signatureUrl,
        customer_present: customerPresent,
        customer_name: customerName || null,
        status: 'completed',
      })

      if (insertErr) throw insertErr

      setSubmitted(true)
    } catch (err: any) {
      console.error('Submit error:', err)
      setSubmitError(err?.message || 'Failed to save check-in. Please try again.')
    }
    setSubmitting(false)
  }

  /* ================================================================ */
  /*  Validation helpers                                               */
  /* ================================================================ */

  const canGoNext = () => {
    if (step === 0) return !!(year && make && model)
    if (step === 2) {
      const requiredFilled = photos.filter((p) => p.required).every((p) => p.file !== null)
      return requiredFilled
    }
    if (step === 4) {
      if (!customerPresent) return true
      return hasSigned && customerName.trim().length > 0
    }
    return true
  }

  /* ================================================================ */
  /*  Submitted success screen                                         */
  /* ================================================================ */

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(34,192,122,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Check size={36} style={{ color: 'var(--green)' }} />
          </div>
          <h1
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--text1)',
              marginBottom: 8,
            }}
          >
            Check-In Complete
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Vehicle has been checked in for{' '}
            <span style={{ color: 'var(--text1)', fontWeight: 600 }}>
              {job?.title || `Job #${jobId.slice(0, 8)}`}
            </span>
            . All data and photos have been saved.
          </p>
          <button
            onClick={() => router.push(`/projects/${jobId}`)}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 32px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Back to Job
          </button>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '16px 12px 100px',
      }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        {/* ---- Header ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text2)',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 22,
                fontWeight: 900,
                color: 'var(--text1)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              VEHICLE CHECK-IN
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {job?.title || `Job #${jobId.slice(0, 8)}`}
              {job?.vehicle_desc ? ` - ${job.vehicle_desc}` : ''}
            </div>
          </div>
          <Car size={22} style={{ color: 'var(--accent)' }} />
        </div>

        {/* ---- Step Indicator ---- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: i === step ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  background:
                    i < step
                      ? 'var(--green)'
                      : i === step
                      ? 'var(--accent)'
                      : 'var(--surface2)',
                  transition: 'all 0.3s ease',
                }}
                title={label}
              />
            </div>
          ))}
        </div>

        {/* ---- Step Title ---- */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}
        >
          Step {step + 1} of 5
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)',
            marginBottom: 16,
          }}
        >
          {STEP_LABELS[step]}
        </div>

        {/* ============================================================ */}
        {/*  STEP 1: Vehicle Info                                         */}
        {/* ============================================================ */}
        {step === 0 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            {/* Vehicle Selector with VIN */}
            <VehicleSelector
              showVinField={true}
              onVehicleSelect={(veh: VehicleEntry) => {
                setYear(String(veh.year))
                setMake(veh.make)
                setModel(veh.model)
              }}
              defaultYear={year ? parseInt(year) : undefined}
              defaultMake={make || undefined}
              defaultModel={model || undefined}
            />

            {/* Color / Odometer / License Plate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="White"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Odometer</label>
                <input
                  type="text"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))}
                  placeholder="45,000"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>License Plate</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="ABC-1234"
                style={inputStyle}
              />
            </div>

            {/* Vehicle Type */}
            <label style={labelStyle}>Vehicle Type</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {VEHICLE_TYPES.map((vt) => (
                <button
                  key={vt}
                  onClick={() => setVehicleType(vt)}
                  style={{
                    background: vehicleType === vt ? 'rgba(79,127,255,0.15)' : 'var(--bg)',
                    border: `1px solid ${vehicleType === vt ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '10px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: vehicleType === vt ? 'var(--accent)' : 'var(--text2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 2: Exterior Condition                                   */}
        {/* ============================================================ */}
        {step === 1 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Tap on the vehicle diagram to mark existing damage.
            </div>

            {/* SVG vehicle diagram */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
                position: 'relative',
              }}
            >
              <svg
                ref={svgRef}
                viewBox="0 0 300 180"
                style={{
                  width: '100%',
                  height: 'auto',
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
                onClick={handleSvgClick}
              >
                {/* Vehicle body outline */}
                <rect
                  x="30"
                  y="30"
                  width="240"
                  height="120"
                  rx="20"
                  ry="20"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                />
                {/* Roof line / windshield */}
                <path
                  d="M80 30 L80 15 Q150 5 220 15 L220 30"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="1.5"
                />
                {/* Hood line */}
                <line x1="30" y1="90" x2="70" y2="90" stroke="var(--text3)" strokeWidth="1" strokeDasharray="4 2" />
                {/* Trunk line */}
                <line x1="230" y1="90" x2="270" y2="90" stroke="var(--text3)" strokeWidth="1" strokeDasharray="4 2" />
                {/* Front axle */}
                <ellipse cx="75" cy="150" rx="20" ry="20" fill="none" stroke="var(--text3)" strokeWidth="2" />
                <ellipse cx="75" cy="150" rx="8" ry="8" fill="var(--text3)" opacity="0.3" />
                {/* Rear axle */}
                <ellipse cx="225" cy="150" rx="20" ry="20" fill="none" stroke="var(--text3)" strokeWidth="2" />
                <ellipse cx="225" cy="150" rx="8" ry="8" fill="var(--text3)" opacity="0.3" />
                {/* Side mirrors */}
                <rect x="22" y="50" width="8" height="16" rx="3" fill="none" stroke="var(--text3)" strokeWidth="1" />
                <rect x="270" y="50" width="8" height="16" rx="3" fill="none" stroke="var(--text3)" strokeWidth="1" />
                {/* Headlights */}
                <rect x="30" y="40" width="14" height="10" rx="3" fill="var(--amber)" opacity="0.2" />
                <rect x="30" y="130" width="14" height="10" rx="3" fill="var(--amber)" opacity="0.2" />
                {/* Taillights */}
                <rect x="256" y="40" width="14" height="10" rx="3" fill="var(--red)" opacity="0.2" />
                <rect x="256" y="130" width="14" height="10" rx="3" fill="var(--red)" opacity="0.2" />
                {/* Labels */}
                <text x="50" y="95" fill="var(--text3)" fontSize="8" textAnchor="middle" opacity="0.5">
                  FRONT
                </text>
                <text x="250" y="95" fill="var(--text3)" fontSize="8" textAnchor="middle" opacity="0.5">
                  REAR
                </text>
                <text x="150" y="20" fill="var(--text3)" fontSize="7" textAnchor="middle" opacity="0.5">
                  DRIVER SIDE
                </text>
                <text x="150" y="168" fill="var(--text3)" fontSize="7" textAnchor="middle" opacity="0.5">
                  PASSENGER SIDE
                </text>

                {/* Damage markers */}
                {markers.map((m) => (
                  <g key={m.id}>
                    <circle
                      cx={(m.x / 100) * 300}
                      cy={(m.y / 100) * 180}
                      r="8"
                      fill={DAMAGE_COLORS[m.type]}
                      opacity="0.85"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={(m.x / 100) * 300}
                      y={(m.y / 100) * 180 + 3.5}
                      fill="#fff"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {m.type[0].toUpperCase()}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Damage legend */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {DAMAGE_TYPES.map((dt) => (
                <div
                  key={dt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: 'var(--text2)',
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: DAMAGE_COLORS[dt],
                    }}
                  />
                  {dt.charAt(0).toUpperCase() + dt.slice(1)}
                </div>
              ))}
            </div>

            {/* Marker list */}
            {markers.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px 0',
                  color: 'var(--text3)',
                  fontSize: 13,
                }}
              >
                No damage marked. Tap the diagram above to add markers.
              </div>
            )}

            {markers.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'var(--bg)',
                  border: `1px solid ${editingMarker === m.id ? DAMAGE_COLORS[m.type] : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: DAMAGE_COLORS[m.type],
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                      {m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setEditingMarker(editingMarker === m.id ? null : m.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text3)',
                        padding: 4,
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => removeMarker(m.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--red)',
                        padding: 4,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {editingMarker === m.id && (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      {DAMAGE_TYPES.map((dt) => (
                        <button
                          key={dt}
                          onClick={() => updateMarker(m.id, { type: dt })}
                          style={{
                            background: m.type === dt ? DAMAGE_COLORS[dt] : 'var(--surface)',
                            color: m.type === dt ? '#fff' : 'var(--text2)',
                            border: `1px solid ${m.type === dt ? DAMAGE_COLORS[dt] : 'var(--border)'}`,
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {dt.charAt(0).toUpperCase() + dt.slice(1)}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={m.notes}
                      onChange={(e) => updateMarker(m.id, { notes: e.target.value })}
                      placeholder="Notes about this damage..."
                      style={inputStyle}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 3: Photos                                               */}
        {/* ============================================================ */}
        {step === 2 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              Capture photos of the vehicle. Required photos are marked with a red asterisk.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {photos.map((slot) => (
                <div
                  key={slot.key}
                  style={{
                    background: 'var(--bg)',
                    border: `1px solid ${slot.file ? 'var(--green)' : slot.required ? 'rgba(242,90,90,0.3)' : 'var(--border)'}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {/* Preview or capture button */}
                  {slot.preview ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={slot.preview}
                        alt={slot.label}
                        style={{
                          width: '100%',
                          aspectRatio: '4/3',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <button
                        onClick={() => clearPhoto(slot.key)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={12} />
                      </button>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.6)',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={11} style={{ color: 'var(--green)' }} />
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{slot.label}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRefs.current[slot.key]?.click()}
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: 12,
                      }}
                    >
                      <Camera size={24} style={{ color: slot.required ? 'var(--accent)' : 'var(--text3)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                        {slot.label}
                        {slot.required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
                      </span>
                    </button>
                  )}

                  <input
                    ref={(el) => {
                      fileRefs.current[slot.key] = el
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoCapture(slot.key, e)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 4: Notes                                                */}
        {/* ============================================================ */}
        {step === 3 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            <label style={labelStyle}>General Notes</label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Any additional notes about the vehicle condition, special instructions, etc."
              rows={6}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 120,
                lineHeight: 1.5,
              }}
            />

            <div style={{ marginTop: 20 }}>
              {/* Vehicle clean checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'var(--bg)',
                  border: `1px solid ${vehicleClean ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${vehicleClean ? 'var(--green)' : 'var(--text3)'}`,
                    background: vehicleClean ? 'var(--green)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {vehicleClean && <Check size={14} style={{ color: '#fff' }} />}
                </div>
                <input
                  type="checkbox"
                  checked={vehicleClean}
                  onChange={(e) => setVehicleClean(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>Vehicle is clean</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    Vehicle exterior has been washed and is ready for wrap
                  </div>
                </div>
              </label>

              {/* Damage acknowledged checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'var(--bg)',
                  border: `1px solid ${damageAcknowledged ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${damageAcknowledged ? 'var(--amber)' : 'var(--text3)'}`,
                    background: damageAcknowledged ? 'var(--amber)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {damageAcknowledged && <Check size={14} style={{ color: '#fff' }} />}
                </div>
                <input
                  type="checkbox"
                  checked={damageAcknowledged}
                  onChange={(e) => setDamageAcknowledged(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                    Pre-existing damage acknowledged
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    All pre-existing damage has been documented above
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  STEP 5: Signature                                            */}
        {/* ============================================================ */}
        {step === 4 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            {/* Customer present toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                padding: '12px 16px',
                background: 'var(--bg)',
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} style={{ color: 'var(--text2)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Customer present</span>
              </div>
              <button
                onClick={() => setCustomerPresent(!customerPresent)}
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  border: 'none',
                  background: customerPresent ? 'var(--green)' : 'var(--surface2)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: customerPresent ? 23 : 3,
                    transition: 'left 0.2s ease',
                  }}
                />
              </button>
            </div>

            {customerPresent ? (
              <>
                {/* Customer name */}
                <label style={labelStyle}>
                  Customer Name <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name..."
                  style={{ ...inputStyle, marginBottom: 16 }}
                />

                {/* Signature pad */}
                <label style={labelStyle}>
                  Signature <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 10,
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid var(--border)',
                    marginBottom: 10,
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: '100%',
                      height: 180,
                      display: 'block',
                      touchAction: 'none',
                      cursor: 'crosshair',
                    }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!hasSigned && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#bbb',
                        fontSize: 13,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Pencil size={14} /> Sign here
                    </div>
                  )}
                </div>
                <button
                  onClick={clearSignature}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: 12,
                    color: 'var(--text3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <X size={12} /> Clear Signature
                </button>
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  background: 'var(--bg)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                }}
              >
                <AlertTriangle size={28} style={{ color: 'var(--amber)', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>
                  Customer Not Present
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  The check-in will be recorded without a customer signature.
                </div>
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: 'rgba(242,90,90,0.1)',
                  border: '1px solid rgba(242,90,90,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={14} /> {submitError}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  Navigation buttons                                           */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 20,
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            zIndex: 50,
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 10, maxWidth: 430, width: '100%' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 0',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  color: 'var(--text2)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 0',
                  background: canGoNext() ? 'var(--accent)' : 'var(--surface2)',
                  border: 'none',
                  borderRadius: 10,
                  color: canGoNext() ? '#fff' : 'var(--text3)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: canGoNext() ? 'pointer' : 'not-allowed',
                  opacity: canGoNext() ? 1 : 0.6,
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canGoNext() || submitting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 0',
                  background: canGoNext() && !submitting ? 'var(--green)' : 'var(--surface2)',
                  border: 'none',
                  borderRadius: 10,
                  color: canGoNext() && !submitting ? '#fff' : 'var(--text3)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: canGoNext() && !submitting ? 'pointer' : 'not-allowed',
                  opacity: canGoNext() && !submitting ? 1 : 0.6,
                }}
              >
                {submitting ? (
                  'Saving...'
                ) : (
                  <>
                    <Upload size={16} /> Submit Check-In
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                               */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--text1)',
  outline: 'none',
  boxSizing: 'border-box',
}
