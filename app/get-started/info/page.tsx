'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, XCircle } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel, getFunnel } from '@/lib/funnelState'
import { createClient } from '@/lib/supabase/client'

const REFERRAL_OPTIONS = [
  'Google Search',
  'Instagram',
  'Facebook',
  'Friend / Referral',
  'Saw a wrapped vehicle',
  'YouTube',
  'TikTok',
  'Yelp',
  'Other',
]

export default function InfoPage() {
  const router = useRouter()
  const [funnel, setFunnelState] = useState<ReturnType<typeof getFunnel>>({})
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    referralSource: '',
    designNotes: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoIsCrisp, setLogoIsCrisp] = useState<boolean | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const f = getFunnel()
    setFunnelState(f)
    setForm(prev => ({
      ...prev,
      fullName: f.fullName || '',
      email: f.email || '',
      phone: f.phone || '',
      businessName: f.businessName || '',
      referralSource: f.referralSource || '',
      designNotes: f.designNotes || '',
    }))
  }, [])

  function field(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Name is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (!form.phone.trim()) e.phone = 'Phone is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleContinue() {
    if (!validate()) return

    let logoUrl = funnel.logoUrl || ''

    if (logoFile) {
      setUploading(true)
      try {
        const supabase = createClient()
        const ext = logoFile.name.split('.').pop()
        const path = `logos/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('project-files').upload(path, logoFile, { upsert: true })
        if (!error) {
          const { data } = supabase.storage.from('project-files').getPublicUrl(path)
          logoUrl = data.publicUrl
        }
      } catch {
        // non-fatal
      }
      setUploading(false)
    }

    setFunnel({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      businessName: form.businessName || undefined,
      referralSource: form.referralSource || undefined,
      designNotes: form.designNotes || undefined,
      logoUrl: logoUrl || undefined,
      logoIsCrisp: logoIsCrisp ?? undefined,
    })

    router.push('/get-started/checkout')
  }

  const isBusiness = funnel.purpose === 'business'

  return (
    <FunnelShell step={7} backHref="/get-started/coverage">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 8px' }}>
          Tell us about yourself
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9299b5', fontSize: 14 }}>
          We use this to prepare your custom quote.
        </motion.p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480, margin: '0 auto' }}>
        {/* Name */}
        <div>
          <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name *</label>
          <input
            value={form.fullName}
            onChange={e => field('fullName', e.target.value)}
            placeholder="Jane Smith"
            style={{ width: '100%', padding: '12px 14px', background: '#13151c', border: `1px solid ${errors.fullName ? '#f25a5a' : '#1a1d27'}`, borderRadius: 10, color: '#e8eaed', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
          {errors.fullName && <div style={{ color: '#f25a5a', fontSize: 12, marginTop: 4 }}>{errors.fullName}</div>}
        </div>

        {/* Email */}
        <div>
          <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email *</label>
          <input
            value={form.email}
            onChange={e => field('email', e.target.value)}
            type="email"
            placeholder="jane@company.com"
            style={{ width: '100%', padding: '12px 14px', background: '#13151c', border: `1px solid ${errors.email ? '#f25a5a' : '#1a1d27'}`, borderRadius: 10, color: '#e8eaed', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
          {errors.email && <div style={{ color: '#f25a5a', fontSize: 12, marginTop: 4 }}>{errors.email}</div>}
        </div>

        {/* Phone */}
        <div>
          <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone *</label>
          <input
            value={form.phone}
            onChange={e => field('phone', e.target.value)}
            type="tel"
            placeholder="(206) 555-0100"
            style={{ width: '100%', padding: '12px 14px', background: '#13151c', border: `1px solid ${errors.phone ? '#f25a5a' : '#1a1d27'}`, borderRadius: 10, color: '#e8eaed', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
          {errors.phone && <div style={{ color: '#f25a5a', fontSize: 12, marginTop: 4 }}>{errors.phone}</div>}
        </div>

        {/* Business name (business only) */}
        {isBusiness && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>Business Name</label>
            <input
              value={form.businessName}
              onChange={e => field('businessName', e.target.value)}
              placeholder="Acme Corp"
              style={{ width: '100%', padding: '12px 14px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10, color: '#e8eaed', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </motion.div>
        )}

        {/* How heard */}
        <div>
          <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>How did you hear about us?</label>
          <select
            value={form.referralSource}
            onChange={e => field('referralSource', e.target.value)}
            style={{ width: '100%', padding: '12px 14px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10, color: form.referralSource ? '#e8eaed' : '#5a6080', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="">Select...</option>
            {REFERRAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Logo upload */}
        <div>
          <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>Upload Your Logo (optional)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#13151c', border: '1px dashed #1a1d27', borderRadius: 10, cursor: 'pointer' }}>
            <Upload size={16} color="#5a6080" />
            <span style={{ color: logoFile ? '#22c07a' : '#5a6080', fontSize: 14 }}>
              {logoFile ? logoFile.name : 'Choose file (PNG, AI, SVG, PDF)'}
            </span>
            <input type="file" accept=".png,.jpg,.svg,.ai,.pdf,.eps" onChange={e => setLogoFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Logo quality toggle */}
        {logoFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 8 }}>Is your logo crisp (vector) or fuzzy (raster)?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setLogoIsCrisp(true)}
                style={{ flex: 1, padding: '10px', background: logoIsCrisp === true ? '#22c07a15' : '#13151c', border: `1px solid ${logoIsCrisp === true ? '#22c07a' : '#1a1d27'}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: logoIsCrisp === true ? '#22c07a' : '#9299b5', fontSize: 13 }}
              >
                <CheckCircle size={14} /> Crisp (vector)
              </button>
              <button
                onClick={() => setLogoIsCrisp(false)}
                style={{ flex: 1, padding: '10px', background: logoIsCrisp === false ? '#f25a5a15' : '#13151c', border: `1px solid ${logoIsCrisp === false ? '#f25a5a' : '#1a1d27'}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: logoIsCrisp === false ? '#f25a5a' : '#9299b5', fontSize: 13 }}
              >
                <XCircle size={14} /> Fuzzy (raster)
              </button>
            </div>
          </motion.div>
        )}

        {/* Design notes */}
        <div>
          <label style={{ fontSize: 13, color: '#9299b5', fontWeight: 600, display: 'block', marginBottom: 6 }}>Design Notes (optional)</label>
          <textarea
            value={form.designNotes}
            onChange={e => field('designNotes', e.target.value)}
            placeholder="Colors, style inspiration, must-have elements..."
            rows={3}
            style={{ width: '100%', padding: '12px 14px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10, color: '#e8eaed', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #4f7fff, #22d3ee)',
            border: 'none',
            borderRadius: 14,
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          {uploading ? 'Uploading...' : 'Review My Quote'}
        </motion.button>
      </div>
    </FunnelShell>
  )
}
