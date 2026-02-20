'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, Camera, Paperclip, type LucideIcon } from 'lucide-react'

interface CustomerIntakePortalProps {
  token: string
}

const VEHICLE_SIDES: { key: string; label: string; Icon: LucideIcon; desc: string }[] = [
  { key: 'front', label: 'Front',          Icon: Car,       desc: 'Straight on from the front — include bumper, hood, grille' },
  { key: 'rear',  label: 'Rear',           Icon: RotateCcw, desc: 'Straight on from the back — include bumper, tailgate/hatch' },
  { key: 'left',  label: 'Driver Side',    Icon: ArrowLeft, desc: 'Full left side — stand back far enough to get the whole vehicle' },
  { key: 'right', label: 'Passenger Side', Icon: ArrowRight,desc: 'Full right side — same distance as driver side' },
  { key: 'top',   label: 'Roof (if needed)',Icon: ArrowUp,  desc: 'Optional — only if roof wrap is included in scope' },
]

export default function CustomerIntakePortal({ token }: CustomerIntakePortalProps) {
  const [intake, setIntake] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    brand_colors: '',
    brand_fonts: '',
    design_brief: '',
    text_content: '',
    references_notes: '',
    removal_required: false,
    removal_description: '',
  })
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([])
  const [logoFiles, setLogoFiles] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('customer_intake')
        .select('*')
        .eq('token', token)
        .single()

      if (data) {
        setIntake(data)
        setForm({
          customer_name: data.customer_name || '',
          customer_email: data.customer_email || '',
          customer_phone: data.customer_phone || '',
          brand_colors: data.brand_colors || '',
          brand_fonts: data.brand_fonts || '',
          design_brief: data.design_brief || '',
          text_content: data.text_content || '',
          references_notes: data.references_notes || '',
          removal_required: data.removal_required || false,
          removal_description: data.removal_description || '',
        })
        setVehiclePhotos(data.vehicle_photos || [])
        setLogoFiles(data.logo_files || [])
        if (data.completed) setSubmitted(true)
      }
      setLoading(false)
    }
    load()
  }, [token])

  const ff = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }))

  const uploadPhoto = async (side: string, file: File) => {
    if (!intake) return
    setUploading(side)
    const path = `intake/${intake.project_id}/${side}_${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
      const newPhotos = [...vehiclePhotos.filter(p => p.side !== side), { url: publicUrl, side, uploaded_at: new Date().toISOString() }]
      setVehiclePhotos(newPhotos)

      await supabase.from('customer_intake').update({
        vehicle_photos: newPhotos,
        updated_at: new Date().toISOString(),
      }).eq('token', token)
    }
    setUploading(null)
  }

  const uploadLogo = async (file: File) => {
    if (!intake) return
    setUploading('logo')
    const path = `intake/${intake.project_id}/logo_${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
      const newLogos = [...logoFiles, { url: publicUrl, file_name: file.name, uploaded_at: new Date().toISOString() }]
      setLogoFiles(newLogos)

      await supabase.from('customer_intake').update({
        logo_files: newLogos,
        updated_at: new Date().toISOString(),
      }).eq('token', token)
    }
    setUploading(null)
  }

  const submit = async () => {
    setSaving(true)
    await supabase.from('customer_intake').update({
      ...form,
      vehicle_photos: vehiclePhotos,
      logo_files: logoFiles,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('token', token)
    setSaving(false)
    setSubmitted(true)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8892a8' }}>Loading...</div>
  if (!intake) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Invalid or expired link.</div>

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 40, textAlign: 'center', background: '#111827', borderRadius: 16, border: '1px solid #1e2d4a' }}>
        <CheckCircle2 size={48} style={{ margin: '0 auto 16px', color: '#22c55e' }} />
        <div style={{ fontSize: 22, fontWeight: 900, color: '#e8ecf4', marginBottom: 8 }}>Thank You!</div>
        <div style={{ fontSize: 14, color: '#8892a8' }}>Your information has been submitted. Our team will review and get started on your project.</div>
      </div>
    )
  }

  const photosComplete = VEHICLE_SIDES.slice(0, 4).every(s => vehiclePhotos.find(p => p.side === s.key))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#e8ecf4', letterSpacing: '-.02em' }}>USA WRAP CO</div>
        <div style={{ fontSize: 14, color: '#8892a8', marginTop: 4 }}>Vehicle Wrap Intake Form</div>
      </div>

      {/* Contact Info */}
      <Section label="Your Contact Info">
        <Grid cols={2}>
          <Field label="Your Name *">
            <input style={inp} value={form.customer_name} onChange={e => ff('customer_name', e.target.value)} placeholder="John Smith" />
          </Field>
          <Field label="Email *">
            <input style={inp} type="email" value={form.customer_email} onChange={e => ff('customer_email', e.target.value)} placeholder="john@company.com" />
          </Field>
          <Field label="Phone">
            <input style={inp} value={form.customer_phone} onChange={e => ff('customer_phone', e.target.value)} placeholder="(555) 000-0000" />
          </Field>
        </Grid>
      </Section>

      {/* Vehicle Photos */}
      <Section label="Vehicle Photos — All Sides">
        <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 16 }}>
          Please upload clear photos of your vehicle from each angle. Stand back far enough to capture the entire side.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {VEHICLE_SIDES.map(side => {
            const photo = vehiclePhotos.find(p => p.side === side.key)
            return (
              <div key={side.key} style={{
                border: `2px dashed ${photo ? '#22c55e40' : '#1e2d4a'}`,
                borderRadius: 12, padding: 16, textAlign: 'center',
                background: photo ? 'rgba(34,197,94,0.03)' : '#0c1222',
                position: 'relative',
              }}>
                {photo ? (
                  <>
                    <img src={photo.url} alt={side.label} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>✓ {side.label}</div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 8, display:'flex', justifyContent:'center' }}><side.Icon size={32} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8ecf4', marginBottom: 4 }}>{side.label}</div>
                    <div style={{ fontSize: 11, color: '#5a6478', marginBottom: 12 }}>{side.desc}</div>
                    <label style={{
                      display: 'inline-block', padding: '8px 16px', borderRadius: 8,
                      background: '#4f7fff', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {uploading === side.key ? 'Uploading...' : <><Camera size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Upload Photo</>}
                      <input type="file" accept="image/*" capture="environment" hidden
                        onChange={e => e.target.files?.[0] && uploadPhoto(side.key, e.target.files[0])} />
                    </label>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Logo & Brand */}
      <Section label="Logo & Brand Materials">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 12 }}>
            Upload your logo files (AI, EPS, PDF, PNG, SVG preferred). Multiple files welcome.
          </div>
          <label style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 8,
            background: '#8b5cf6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {uploading === 'logo' ? 'Uploading...' : <><Paperclip size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Upload Logo / Files</>}
            <input type="file" accept="image/*,.ai,.eps,.pdf,.svg" multiple hidden
              onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(f => uploadLogo(f)) }} />
          </label>
          {logoFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {logoFiles.map((f, i) => (
                <div key={i} style={{ padding: '6px 12px', background: '#1a2540', borderRadius: 6, fontSize: 11, color: '#8892a8' }}>
                  <Paperclip size={10} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} /> {f.file_name}
                </div>
              ))}
            </div>
          )}
        </div>
        <Grid cols={2}>
          <Field label="Brand Colors">
            <input style={inp} value={form.brand_colors} onChange={e => ff('brand_colors', e.target.value)} placeholder="Blue (#003DA5), White, Black" />
          </Field>
          <Field label="Fonts (if known)">
            <input style={inp} value={form.brand_fonts} onChange={e => ff('brand_fonts', e.target.value)} placeholder="Montserrat Bold, Helvetica" />
          </Field>
        </Grid>
      </Section>

      {/* Design Brief */}
      <Section label="Design Information">
        <Grid cols={1}>
          <Field label="What do you want on your wrap? *">
            <textarea style={{ ...inp, minHeight: 100 }} value={form.design_brief} onChange={e => ff('design_brief', e.target.value)}
              placeholder="Describe what you're looking for — full wrap with company branding, partial wrap with logo and phone number, color change, etc." />
          </Field>
          <Field label="Text / Copy for the Wrap">
            <textarea style={{ ...inp, minHeight: 80 }} value={form.text_content} onChange={e => ff('text_content', e.target.value)}
              placeholder="Phone number, website, slogan, license #, social media handles..." />
          </Field>
          <Field label="Reference Images or Inspiration">
            <textarea style={{ ...inp, minHeight: 60 }} value={form.references_notes} onChange={e => ff('references_notes', e.target.value)}
              placeholder="Links to wraps you like, competitor examples, style preferences..." />
          </Field>
        </Grid>
      </Section>

      {/* Removal */}
      <Section label="Existing Wrap / Removal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" id="removal" checked={form.removal_required}
            onChange={e => ff('removal_required', e.target.checked)}
            style={{ width: 18, height: 18 }} />
          <label htmlFor="removal" style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf4', cursor: 'pointer' }}>
            Vehicle has existing wrap, decals, or graphics that need removal
          </label>
        </div>
        {form.removal_required && (
          <Field label="Describe what needs to be removed">
            <textarea style={{ ...inp, minHeight: 60 }} value={form.removal_description}
              onChange={e => ff('removal_description', e.target.value)}
              placeholder="Full wrap removal, partial decals on doors, old lettering on tailgate..." />
          </Field>
        )}
      </Section>

      {/* Submit */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button onClick={submit} disabled={saving || !form.customer_name || !form.customer_email}
          style={{
            padding: '16px 48px', borderRadius: 12, fontWeight: 900, fontSize: 16,
            cursor: 'pointer', border: 'none',
            background: '#22c55e', color: '#0d1a10',
            opacity: saving || !form.customer_name ? 0.5 : 1,
          }}>
          {saving ? 'Submitting...' : '✓ Submit Information'}
        </button>
      </div>

      {!photosComplete && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#f59e0b' }}>
          Tip: Upload all 4 vehicle photos for the fastest turnaround
        </div>
      )}
    </div>
  )
}

// Helpers
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6478', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8, marginBottom: 14, borderBottom: '1px solid #1e2d4a' }}>{label}</div>
      {children}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#5a6478', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>{children}</div>
}
const inp: React.CSSProperties = {
  width: '100%', background: '#0c1222', border: '1px solid #1e2d4a',
  borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e8ecf4', outline: 'none',
}
