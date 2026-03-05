'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Camera, Plus, Car, AlertTriangle,
  ChevronDown, ChevronRight, Trash2, X,
  ZoomIn, Flag, ScanLine, Loader2,
  ArrowRight, Database, Wrench, Video, VideoOff,
} from 'lucide-react'
import VehicleSelectorFull, { VehicleMeasurements } from '@/components/shared/VehicleSelectorFull'
import PhotoInspection from '@/components/estimates/PhotoInspection'

const supabase = createClient()

// ─── NHTSA VIN DECODE API (free, no key needed) ───────────────
async function decodeVIN(vin: string): Promise<{
  year: string; make: string; model: string; trim: string
  bodyClass: string; vehicleType: string; error?: string
} | null> {
  if (vin.length !== 17) return null
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`,
      { signal: AbortSignal.timeout(5000) }
    )
    const json = await res.json()
    const get = (v: string) => json.Results?.find((r: any) => r.Variable === v)?.Value || ''
    const year = get('Model Year')
    const make = get('Make')
    const model = get('Model')
    const trim = get('Trim')
    const bodyClass = get('Body Class')
    const vehicleType = get('Vehicle Type')
    if (!make || make === 'Not Applicable') return null
    return { year, make, model, trim, bodyClass, vehicleType }
  } catch {
    return null
  }
}

// ─── TYPES ────────────────────────────────────────────────────
interface SurveyVehicle {
  id: string
  line_item_id?: string
  vin?: string
  vin_decoded: boolean
  vehicle_year?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_trim?: string
  vehicle_color?: string
  vehicle_plate?: string
  design_notes?: string
  concern_notes?: string
  existing_graphics: boolean
  surface_condition?: string
  sqft?: number
  sort_order: number
  photos: SurveyPhoto[]
  // UI state
  _expanded: boolean
  _decoding?: boolean
  _vinError?: string
  _lineItemSpecs?: Record<string, unknown>
}

interface SurveyPhoto {
  id: string
  public_url: string
  angle?: string
  category?: string
  caption?: string
  concern_type?: string
  is_flagged: boolean
}

type AddMode = 'vin' | 'db' | 'manual'

const PHOTO_ANGLES = [
  { id: 'front',          label: 'Front',       },
  { id: 'driver_side',    label: 'Driver Side', },
  { id: 'passenger_side', label: 'Pass. Side',  },
  { id: 'rear',           label: 'Rear',        },
  { id: 'detail',         label: 'Detail',      },
  { id: 'existing_vinyl', label: 'Exist. Vinyl',},
]

const CONCERN_TYPES = [
  { id: 'rust',           label: 'Rust/Oxidation',  color: 'var(--amber)' },
  { id: 'dent',           label: 'Dent/Damage',     color: 'var(--red)' },
  { id: 'scratch',        label: 'Scratch',         color: '#facc15' },
  { id: 'existing_vinyl', label: 'Existing Vinyl',  color: 'var(--accent)' },
  { id: 'other',          label: 'Other',           color: 'var(--text2)' },
]

const SURFACE_CONDITIONS = [
  { id: 'good', label: 'Good',  color: 'var(--green)', border: 'rgba(34,192,122,0.3)' },
  { id: 'fair', label: 'Fair',  color: 'var(--amber)', border: 'rgba(245,158,11,0.3)' },
  { id: 'poor', label: 'Poor',  color: 'var(--red)',   border: 'rgba(242,90,90,0.3)' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function EstimateSurveyTab({
  estimateId,
  orgId,
  userId,
  onVehicleAddedToLineItems,
}: {
  estimateId: string
  orgId: string
  userId: string
  onVehicleAddedToLineItems?: (v: SurveyVehicle) => void
}) {
  const [vehicles, setVehicles] = useState<SurveyVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<SurveyPhoto | null>(null)
  const [inspectVehicleId, setInspectVehicleId] = useState<string | null>(null)

  // Add vehicle mode
  const [addMode, setAddMode] = useState<AddMode>('vin')

  // VIN tab state
  const [vinInput, setVinInput] = useState('')
  const [addingVehicle, setAddingVehicle] = useState(false)
  const vinRef = useRef<HTMLInputElement>(null)

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // DB tab state
  const [selectedDbVehicle, setSelectedDbVehicle] = useState<VehicleMeasurements | null>(null)
  const [dbSqft, setDbSqft] = useState(0)

  // Manual tab state
  const [quickMake, setQuickMake] = useState('')
  const [quickModel, setQuickModel] = useState('')
  const [quickYear, setQuickYear] = useState('')

  // ─── LOAD ────────────────────────────────────────────────────
  useEffect(() => {
    if (!estimateId) return
    supabase
      .from('estimate_survey_vehicles')
      .select(`*, estimate_survey_photos(*)`)
      .eq('estimate_id', estimateId)
      .order('sort_order')
      .then(async ({ data }) => {
        if (data) {
          const base = data.map((v: any) => ({
            ...v,
            photos: v.estimate_survey_photos || [],
            _expanded: false,
          }))

          // Match associated line items via specs.surveyVehicleId
          const { data: lineItems } = await supabase
            .from('line_items')
            .select('id, specs')
            .eq('parent_type', 'estimate')
            .eq('parent_id', estimateId)

          if (lineItems) {
            setVehicles(base.map((v: SurveyVehicle) => {
              const li = lineItems.find((l: any) => l.specs?.surveyVehicleId === v.id)
              return li ? { ...v, line_item_id: li.id, _lineItemSpecs: li.specs } : v
            }))
          } else {
            setVehicles(base)
          }
        }
        setLoading(false)
      })
  }, [estimateId])

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  // ─── CREATE LINE ITEM ─────────────────────────────────────────
  const createLineItem = useCallback(async (vehicleData: {
    id: string; year?: string; make?: string; model?: string; trim?: string; sqft?: number
  }) => {
    const description = [vehicleData.year, vehicleData.make, vehicleData.model]
      .filter(Boolean).join(' ') || 'Vehicle Wrap'

    const { data } = await supabase
      .from('line_items')
      .insert({
        org_id: orgId,
        parent_type: 'estimate',
        parent_id: estimateId,
        description,
        category: 'wrap',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        sort_order: Date.now(),
        specs: {
          vehicleYear: vehicleData.year,
          vehicleMake: vehicleData.make,
          vehicleModel: vehicleData.model,
          vehicleTrim: vehicleData.trim,
          sqft: vehicleData.sqft,
          from_survey: true,
          surveyVehicleId: vehicleData.id,
        },
      })
      .select('id')
      .single()

    return data?.id as string | null
  }, [orgId, estimateId])

  // ─── CAMERA SCAN ─────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)

      // Try BarcodeDetector API (Chrome/Android)
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['code_39', 'code_128', 'pdf417', 'qr_code']
        })
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            for (const code of codes) {
              const raw = (code.rawValue as string)
                .replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase()
              if (raw.length === 17) {
                stopCamera()
                setVinInput(raw)
                return
              }
            }
          } catch { /* ignore detection errors */ }
        }, 500)
      }
    } catch {
      alert('Camera access denied. Enter VIN manually.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }, [])

  // ─── HANDLE VIN SUBMIT ────────────────────────────────────────
  const handleVINSubmit = async () => {
    const vin = vinInput.trim().toUpperCase()
    if (vin.length !== 17) {
      alert('VIN must be exactly 17 characters')
      return
    }
    setAddingVehicle(true)

    const decoded = await decodeVIN(vin)

    const vehicleData = {
      org_id: orgId,
      estimate_id: estimateId,
      vin,
      vin_decoded: !!decoded,
      vehicle_year: decoded?.year || '',
      vehicle_make: decoded?.make || '',
      vehicle_model: decoded?.model || '',
      vehicle_trim: decoded?.trim || '',
      existing_graphics: false,
      sort_order: vehicles.length,
      surveyed_by: userId,
    }

    const { data, error } = await supabase
      .from('estimate_survey_vehicles')
      .insert(vehicleData)
      .select()
      .single()

    if (!error && data) {
      const lineItemId = await createLineItem({
        id: data.id,
        year: decoded?.year,
        make: decoded?.make,
        model: decoded?.model,
        trim: decoded?.trim,
      })

      const newVehicle: SurveyVehicle = {
        ...data,
        photos: [],
        line_item_id: lineItemId ?? undefined,
        _expanded: true,
        _decoding: false,
        _vinError: decoded ? undefined : 'Could not decode VIN — enter details manually',
      }
      setVehicles(prev => [...prev, newVehicle])
      setVinInput('')
      vinRef.current?.focus()
      if (onVehicleAddedToLineItems) onVehicleAddedToLineItems(newVehicle)
    }
    setAddingVehicle(false)
  }

  // ─── HANDLE MANUAL ADD ───────────────────────────────────────
  const handleManualAdd = async () => {
    if (!quickMake.trim()) return
    setAddingVehicle(true)

    const vehicleData = {
      org_id: orgId,
      estimate_id: estimateId,
      vin_decoded: false,
      vehicle_year: quickYear,
      vehicle_make: quickMake,
      vehicle_model: quickModel,
      existing_graphics: false,
      sort_order: vehicles.length,
      surveyed_by: userId,
    }

    const { data, error } = await supabase
      .from('estimate_survey_vehicles')
      .insert(vehicleData)
      .select()
      .single()

    if (!error && data) {
      const lineItemId = await createLineItem({
        id: data.id,
        year: quickYear || undefined,
        make: quickMake,
        model: quickModel || undefined,
      })

      const newVehicle: SurveyVehicle = {
        ...data, photos: [], line_item_id: lineItemId ?? undefined, _expanded: true,
      }
      setVehicles(prev => [...prev, newVehicle])
      setQuickMake('')
      setQuickModel('')
      setQuickYear('')
      if (onVehicleAddedToLineItems) onVehicleAddedToLineItems(newVehicle)
    }
    setAddingVehicle(false)
  }

  // ─── HANDLE DB VEHICLE ADD ────────────────────────────────────
  const handleDBVehicleAdd = async () => {
    if (!selectedDbVehicle) return
    setAddingVehicle(true)

    const year = selectedDbVehicle.year_start === selectedDbVehicle.year_end
      ? String(selectedDbVehicle.year_start)
      : `${selectedDbVehicle.year_start}–${selectedDbVehicle.year_end}`

    const vehicleData = {
      org_id: orgId,
      estimate_id: estimateId,
      vin_decoded: false,
      vehicle_year: year,
      vehicle_make: selectedDbVehicle.make,
      vehicle_model: selectedDbVehicle.model,
      existing_graphics: false,
      sort_order: vehicles.length,
      surveyed_by: userId,
    }

    const { data, error } = await supabase
      .from('estimate_survey_vehicles')
      .insert(vehicleData)
      .select()
      .single()

    if (!error && data) {
      const sqft = dbSqft || selectedDbVehicle.full_wrap_sqft || undefined
      const lineItemId = await createLineItem({
        id: data.id, year, make: selectedDbVehicle.make, model: selectedDbVehicle.model, sqft,
      })

      const specs = {
        vehicleMeasurementId: selectedDbVehicle.id,
        vehicleYear: year,
        vehicleMake: selectedDbVehicle.make,
        vehicleModel: selectedDbVehicle.model,
        sqft,
        installHours: selectedDbVehicle.install_hours,
        installPay: selectedDbVehicle.install_pay,
        from_survey: true,
        surveyVehicleId: data.id,
      }

      const newVehicle: SurveyVehicle = {
        ...data, photos: [],
        line_item_id: lineItemId ?? undefined,
        sqft: sqft as number | undefined,
        _expanded: true,
        _lineItemSpecs: specs,
      }
      setVehicles(prev => [...prev, newVehicle])
      setSelectedDbVehicle(null)
      setDbSqft(0)
      if (onVehicleAddedToLineItems) onVehicleAddedToLineItems(newVehicle)
    }
    setAddingVehicle(false)
  }

  // ─── UPDATE VEHICLE ───────────────────────────────────────────
  const updateVehicle = useCallback(async (id: string, updates: Partial<SurveyVehicle>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    // Strip UI-only fields before DB update
    const { _expanded, _decoding, _vinError, photos, line_item_id, sqft, _lineItemSpecs, ...dbUpdates } = updates as any
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('estimate_survey_vehicles').update(dbUpdates).eq('id', id)
    }
  }, [])

  // ─── PHOTO UPLOAD ─────────────────────────────────────────────
  const handlePhotoUpload = async (
    vehicleId: string,
    files: FileList | null,
    angle?: string,
    category: string = 'pre_install'
  ) => {
    if (!files?.length) return
    setUploadingFor(vehicleId)

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `survey/${estimateId}/${vehicleId}/${Date.now()}.${ext}`

      let bucket = 'project-files'
      const { error: uploadError } = await supabase.storage
        .from(bucket).upload(path, file, { upsert: false })

      if (uploadError) {
        bucket = 'job-photos'
        const { error: e2 } = await supabase.storage
          .from(bucket).upload(path, file, { upsert: false })
        if (e2) continue
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

      const { data: photoData } = await supabase
        .from('estimate_survey_photos')
        .insert({
          org_id: orgId,
          estimate_id: estimateId,
          survey_vehicle_id: vehicleId,
          storage_path: path,
          public_url: urlData.publicUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          angle: angle || 'detail',
          category,
          is_flagged: category === 'concern',
          uploaded_by: userId,
        })
        .select()
        .single()

      if (photoData) {
        setVehicles(prev => prev.map(v =>
          v.id === vehicleId
            ? { ...v, photos: [...v.photos, { ...photoData, is_flagged: photoData.is_flagged || false }] }
            : v
        ))
      }
    }
    setUploadingFor(null)
  }

  // ─── DELETE VEHICLE ───────────────────────────────────────────
  const deleteVehicle = async (id: string) => {
    if (!confirm('Remove this vehicle from the survey?')) return
    const vehicle = vehicles.find(v => v.id === id)
    await supabase.from('estimate_survey_vehicles').delete().eq('id', id)
    if (vehicle?.line_item_id) {
      await supabase.from('line_items').delete().eq('id', vehicle.line_item_id)
    }
    setVehicles(prev => prev.filter(v => v.id !== id))
  }

  const totalPhotos = vehicles.reduce((s, v) => s + v.photos.length, 0)
  const totalConcerns = vehicles.reduce((s, v) => s + v.photos.filter(p => p.is_flagged).length, 0)
  const inspectVehicle = vehicles.find(v => v.id === inspectVehicleId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── ADD VEHICLE PANEL ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16,
      }}>
        {/* Tab toggle: VIN | DB | Manual */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
          {([
            { key: 'vin' as AddMode,    label: 'Scan / VIN',  icon: <ScanLine size={12} /> },
            { key: 'db'  as AddMode,    label: 'Vehicle DB',  icon: <Database size={12} /> },
            { key: 'manual' as AddMode, label: 'Manual',       icon: <Car size={12} /> },
          ]).map(m => (
            <button
              key={m.key}
              onClick={() => { setAddMode(m.key); stopCamera() }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '10px 0', border: 'none', background: 'transparent',
                borderBottom: addMode === m.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: addMode === m.key ? 'var(--text1)' : 'var(--text3)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'color 0.15s',
              }}
            >
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 12 }}>

          {/* ── VIN TAB ── */}
          {addMode === 'vin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                Open camera to scan the VIN barcode (door jamb sticker), or type the 17-char VIN
              </p>

              {/* Camera */}
              {cameraActive ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {/* Scan guide overlay */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ width: '80%', height: 60, border: '2px solid rgba(79,127,255,0.8)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(79,127,255,0.7)', animation: 'scanline 1.8s ease-in-out infinite' }} />
                    </div>
                  </div>
                  <button onClick={stopCamera} style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff',
                    borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                  }}>
                    <VideoOff size={13} /> Stop
                  </button>
                  <div style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 11, color: 'rgba(255,255,255,0.75)',
                    background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 12, whiteSpace: 'nowrap',
                  }}>
                    Point at VIN barcode on door jamb sticker
                  </div>
                </div>
              ) : (
                <button onClick={startCamera} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'rgba(79,127,255,0.06)', border: '1px dashed rgba(79,127,255,0.3)',
                  borderRadius: 10, padding: '11px 0', fontSize: 12,
                  color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                }}>
                  <Video size={14} /> Open Camera to Scan VIN
                </button>
              )}

              {/* Manual VIN input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={vinRef}
                  value={vinInput}
                  onChange={e => setVinInput(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVINSubmit()}
                  placeholder="17-character VIN"
                  maxLength={17}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  style={{
                    flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 12px', fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em',
                    color: 'var(--text1)', outline: 'none',
                  }}
                />
                <button
                  onClick={handleVINSubmit}
                  disabled={vinInput.length !== 17 || addingVehicle}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '10px 16px', fontSize: 13,
                    fontWeight: 700, cursor: 'pointer',
                    opacity: vinInput.length !== 17 || addingVehicle ? 0.4 : 1,
                    transition: 'opacity 0.15s', flexShrink: 0,
                  }}
                >
                  {addingVehicle ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  Add
                </button>
              </div>

              {/* VIN progress dots */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {Array.from({ length: 17 }).map((_, i) => (
                  <div key={i} style={{
                    width: 14, height: 3, borderRadius: 2,
                    background: i < vinInput.length ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.1s',
                  }} />
                ))}
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
                  {vinInput.length}/17{vinInput.length === 17 ? ' ✓' : ''}
                </span>
              </div>
            </div>
          )}

          {/* ── DB LOOKUP TAB ── */}
          {addMode === 'db' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                Search the vehicle database for exact sqft measurements and install times
              </p>
              <VehicleSelectorFull
                compact
                onVehicleSelect={setSelectedDbVehicle}
                onSqftChange={(sqft) => setDbSqft(sqft)}
              />
              {selectedDbVehicle && (
                <div style={{
                  background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', margin: '0 0 2px' }}>
                        {selectedDbVehicle.make} {selectedDbVehicle.model}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                        {selectedDbVehicle.year_range}
                        {(dbSqft || selectedDbVehicle.full_wrap_sqft) ? ` · ${dbSqft || selectedDbVehicle.full_wrap_sqft} sqft` : ''}
                        {selectedDbVehicle.install_hours ? ` · ${selectedDbVehicle.install_hours}h install` : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleDBVehicleAdd}
                      disabled={addingVehicle}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '8px 14px', fontSize: 12,
                        fontWeight: 700, cursor: 'pointer', opacity: addingVehicle ? 0.5 : 1,
                      }}
                    >
                      {addingVehicle ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
                      Add to Survey
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL TAB ── */}
          {addMode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { val: quickYear,  set: setQuickYear,  ph: 'Year',   type: 'number' },
                  { val: quickMake,  set: setQuickMake,  ph: 'Make *', type: 'text' },
                  { val: quickModel, set: setQuickModel, ph: 'Model',  type: 'text' },
                ].map(({ val, set, ph, type }) => (
                  <input
                    key={ph}
                    value={val}
                    onChange={e => set(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                    placeholder={ph}
                    type={type}
                    style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', fontSize: 13,
                      color: 'var(--text1)', outline: 'none',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleManualAdd}
                disabled={!quickMake.trim() || addingVehicle}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 0', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer',
                  opacity: !quickMake.trim() || addingVehicle ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {addingVehicle ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                Add Vehicle to Survey
              </button>
            </div>
          )}
        </div>

        {/* Summary bar */}
        {vehicles.length > 0 && (
          <div style={{
            display: 'flex', gap: 16, padding: '8px 12px',
            background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{vehicles.length}</span>{' '}
              vehicle{vehicles.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{totalPhotos}</span> photos
            </span>
            {totalConcerns > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--amber)' }}>
                <AlertTriangle size={11} />
                {totalConcerns} concern{totalConcerns !== 1 ? 's' : ''} flagged
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── VEHICLE CARDS ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 13 }}>
          Loading survey...
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 20px',
          border: '2px dashed var(--border)', borderRadius: 16,
        }}>
          <Car size={40} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text3)', opacity: 0.4 }} />
          <p style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600, margin: '0 0 4px' }}>
            No vehicles surveyed yet
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
            Scan a VIN, look up from the vehicle DB, or enter manually above
          </p>
        </div>
      ) : (
        vehicles.map((vehicle, idx) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            index={idx}
            uploadingFor={uploadingFor}
            onUpdate={(updates) => updateVehicle(vehicle.id, updates)}
            onUpload={(files, angle, category) => handlePhotoUpload(vehicle.id, files, angle, category)}
            onDelete={() => deleteVehicle(vehicle.id)}
            onOpenLightbox={setLightbox}
            onAddToLineItems={() => onVehicleAddedToLineItems?.(vehicle)}
            onInspect={() => setInspectVehicleId(vehicle.id)}
          />
        ))
      )}

      {/* ── INSPECTION MODAL ── */}
      {inspectVehicle && (
        <div
          onClick={(e) => e.target === e.currentTarget && setInspectVehicleId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{
            background: 'var(--bg)', flex: 1, overflow: 'auto',
            margin: 16, borderRadius: 16, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  Photo Inspection —{' '}
                  {[inspectVehicle.vehicle_year, inspectVehicle.vehicle_make, inspectVehicle.vehicle_model]
                    .filter(Boolean).join(' ') || `Vehicle ${vehicles.indexOf(inspectVehicle) + 1}`}
                </span>
              </div>
              <button
                onClick={() => setInspectVehicleId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 16, flex: 1 }}>
              {inspectVehicle.line_item_id ? (
                <PhotoInspection
                  lineItemId={inspectVehicle.line_item_id}
                  specs={inspectVehicle._lineItemSpecs ?? {}}
                  updateSpec={(key, value) => {
                    setVehicles(prev => prev.map(v =>
                      v.id === inspectVehicle.id
                        ? { ...v, _lineItemSpecs: { ...v._lineItemSpecs, [key]: value } }
                        : v
                    ))
                  }}
                  canWrite
                  orgId={orgId}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 13 }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
                  Setting up inspection...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', padding: 4,
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightbox.public_url}
            alt={lightbox.caption || lightbox.angle || 'photo'}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }}
          />
          {(lightbox.caption || lightbox.angle) && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              fontSize: 12, color: 'rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 20,
            }}>
              {lightbox.angle} · {lightbox.caption}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanline { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(56px); } }
      `}</style>
    </div>
  )
}

// ─── VEHICLE CARD ─────────────────────────────────────────────
function VehicleCard({
  vehicle, index, uploadingFor,
  onUpdate, onUpload, onDelete, onOpenLightbox, onAddToLineItems, onInspect
}: {
  vehicle: SurveyVehicle
  index: number
  uploadingFor: string | null
  onUpdate: (u: Partial<SurveyVehicle>) => void
  onUpload: (files: FileList | null, angle?: string, category?: string) => void
  onDelete: () => void
  onOpenLightbox: (p: SurveyPhoto) => void
  onAddToLineItems: () => void
  onInspect: () => void
}) {
  const vehicleLabel = [vehicle.vehicle_year, vehicle.vehicle_make, vehicle.vehicle_model]
    .filter(Boolean).join(' ') || `Vehicle ${index + 1}`

  const flaggedCount = vehicle.photos.filter(p => p.is_flagged).length
  const hasConcerns = flaggedCount > 0 || !!vehicle.concern_notes

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16, overflow: 'hidden',
      border: hasConcerns ? '1px solid rgba(245,158,11,0.25)' : '1px solid var(--border)',
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        {/* Number badge */}
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{index + 1}</span>
        </div>

        {/* Title */}
        <button
          onClick={() => onUpdate({ _expanded: !vehicle._expanded })}
          style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{vehicleLabel}</span>
            {vehicle.vin_decoded && (
              <span style={{
                fontSize: 10, color: 'var(--green)',
                background: 'rgba(34,192,122,0.1)', padding: '1px 6px', borderRadius: 6,
              }}>VIN ✓</span>
            )}
            {vehicle.sqft && (
              <span style={{
                fontSize: 10, color: 'var(--text2)',
                background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 6,
              }}>{vehicle.sqft} sqft</span>
            )}
            {hasConcerns && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: 'var(--amber)',
                background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 6,
              }}>
                <AlertTriangle size={10} />Concerns
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            {vehicle.vin && (
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>
                {vehicle.vin}
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {vehicle.photos.length} photo{vehicle.photos.length !== 1 ? 's' : ''}
            </span>
            {vehicle.surface_condition && (
              <span style={{
                fontSize: 10, color:
                  vehicle.surface_condition === 'good' ? 'var(--green)' :
                  vehicle.surface_condition === 'fair' ? 'var(--amber)' : 'var(--red)',
              }}>
                {vehicle.surface_condition}
              </span>
            )}
          </div>
        </button>

        {/* Inspect button */}
        <button
          onClick={onInspect}
          title="Photo inspection & markup"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(79,127,255,0.3)',
            background: 'rgba(79,127,255,0.08)', color: 'var(--accent)',
            cursor: 'pointer', fontSize: 11, fontWeight: 600,
          }}
        >
          <Wrench size={12} /> Inspect
        </button>

        <button
          onClick={onAddToLineItems}
          title="Add to line items"
          style={{
            padding: 6, borderRadius: 8, border: 'none', background: 'none',
            color: 'var(--text3)', cursor: 'pointer', display: 'flex',
          }}
        >
          <ArrowRight size={15} />
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: 6, borderRadius: 8, border: 'none', background: 'none',
            color: 'var(--text3)', cursor: 'pointer', display: 'flex',
          }}
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={() => onUpdate({ _expanded: !vehicle._expanded })}
          style={{ padding: 6, border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}
        >
          {vehicle._expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* EXPANDED BODY */}
      {vehicle._expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* VIN error */}
          {vehicle._vinError && (
            <div style={{
              display: 'flex', gap: 8, background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '8px 12px',
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600, margin: '0 0 2px' }}>VIN not decoded</p>
                <p style={{ fontSize: 11, color: 'rgba(245,158,11,0.6)', margin: 0 }}>{vehicle._vinError}</p>
              </div>
            </div>
          )}

          {/* VEHICLE DETAILS */}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
              Vehicle Details
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { val: vehicle.vehicle_year,  key: 'vehicle_year',  ph: 'Year' },
                { val: vehicle.vehicle_color, key: 'vehicle_color', ph: 'Color' },
                { val: vehicle.vehicle_make,  key: 'vehicle_make',  ph: 'Make' },
                { val: vehicle.vehicle_model, key: 'vehicle_model', ph: 'Model' },
                { val: vehicle.vehicle_plate, key: 'vehicle_plate', ph: 'Plate #' },
                { val: vehicle.vehicle_trim,  key: 'vehicle_trim',  ph: 'Trim / Sub-model' },
              ].map(({ val, key, ph }) => (
                <input
                  key={key}
                  value={val || ''}
                  onChange={e => onUpdate({ [key]: e.target.value } as any)}
                  placeholder={ph}
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 12,
                    color: 'var(--text1)', outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* SURFACE CONDITION */}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
              Surface Condition
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {SURFACE_CONDITIONS.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => onUpdate({ surface_condition: sc.id })}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: vehicle.surface_condition === sc.id ? sc.border : 'var(--border)',
                    color: vehicle.surface_condition === sc.id ? sc.color : 'var(--text3)',
                    background: vehicle.surface_condition === sc.id ? `${sc.color}12` : 'transparent',
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* DESIGN NOTES */}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
              Design Notes
            </p>
            <textarea
              value={vehicle.design_notes || ''}
              onChange={e => onUpdate({ design_notes: e.target.value })}
              placeholder="What does the customer want? Colors, coverage, branding notes..."
              rows={2}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', fontSize: 12,
                color: 'var(--text1)', outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* CONCERNS */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>
                Concerns / Issues
              </p>
              {hasConcerns && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--amber)' }}>
                  <AlertTriangle size={10} />Will appear on estimate
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {CONCERN_TYPES.map(ct => {
                const active = vehicle.concern_notes?.includes(ct.label)
                return (
                  <button
                    key={ct.id}
                    onClick={() => {
                      const current = vehicle.concern_notes || ''
                      const tag = `[${ct.label}]`
                      const next = current.includes(tag)
                        ? current.replace(tag, '').trim()
                        : (current + ' ' + tag).trim()
                      onUpdate({ concern_notes: next })
                    }}
                    style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid',
                      borderColor: active ? ct.color : 'var(--border)',
                      color: active ? ct.color : 'var(--text3)',
                      background: active ? `${ct.color}15` : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {ct.label}
                  </button>
                )
              })}
            </div>
            <textarea
              value={vehicle.concern_notes || ''}
              onChange={e => onUpdate({ concern_notes: e.target.value })}
              placeholder="Describe any surface issues, existing vinyl, damage..."
              rows={2}
              style={{
                width: '100%', background: 'var(--bg)',
                border: `1px solid ${hasConcerns ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 12,
                color: 'var(--text1)', outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* PHOTOS */}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
              Photos ({vehicle.photos.length})
            </p>

            {/* Angle quick capture */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
              {PHOTO_ANGLES.map(angle => {
                const hasAngle = vehicle.photos.some(p => p.angle === angle.id)
                return (
                  <label
                    key={angle.id}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '8px 4px', borderRadius: 10, border: '1px solid',
                      borderColor: hasAngle ? 'rgba(79,127,255,0.35)' : 'var(--border)',
                      background: hasAngle ? 'rgba(79,127,255,0.08)' : 'transparent',
                      cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <Camera size={14} style={{ color: hasAngle ? 'var(--accent)' : 'var(--text3)' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: hasAngle ? 'var(--text1)' : 'var(--text3)' }}>
                      {angle.label}
                    </span>
                    {hasAngle && (
                      <span style={{ fontSize: 9, color: 'var(--accent)' }}>✓ taken</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => onUpload(e.target.files, angle.id, 'pre_install')}
                    />
                  </label>
                )
              })}
            </div>

            {/* Flag concern photo */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer', marginBottom: 10,
              boxSizing: 'border-box',
            }}>
              <Flag size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', margin: 0 }}>
                  Flag a Concern Photo
                </p>
                <p style={{ fontSize: 10, color: 'rgba(245,158,11,0.6)', margin: 0 }}>
                  Rust, damage, existing vinyl — sends with estimate
                </p>
              </div>
              <Camera size={15} style={{ color: 'rgba(245,158,11,0.5)' }} />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: 'none' }}
                onChange={e => onUpload(e.target.files, 'detail', 'concern')}
              />
            </label>

            {/* Photo grid */}
            {vehicle.photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {vehicle.photos.map(photo => (
                  <div
                    key={photo.id}
                    onClick={() => onOpenLightbox(photo)}
                    style={{
                      position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                      cursor: 'pointer', border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={photo.public_url}
                      alt={photo.angle || 'photo'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {photo.is_flagged && (
                      <div style={{ position: 'absolute', top: 4, right: 4 }}>
                        <AlertTriangle size={13} style={{ color: 'var(--amber)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                      padding: '12px 5px 4px',
                    }}>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', margin: 0, textTransform: 'capitalize' }}>
                        {photo.angle?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Upload more */}
                <label style={{
                  aspectRatio: '1', borderRadius: 10, border: '2px dashed var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 4, cursor: 'pointer',
                }}>
                  <Plus size={18} style={{ color: 'var(--text3)' }} />
                  <span style={{ fontSize: 9, color: 'var(--text3)' }}>More</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => onUpload(e.target.files, undefined, 'pre_install')}
                  />
                </label>
              </div>
            )}

            {uploadingFor === vehicle.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading...
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
