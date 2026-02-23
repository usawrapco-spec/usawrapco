'use client'

import { useState } from 'react'
import { CreditCard, Shield, CheckCircle, Truck, Palette, Clock, ArrowRight, Lock } from 'lucide-react'

interface Props {
  amount: number
  conversationId: string | null
  conversation: any
}

export default function DepositClient({ amount, conversationId, conversation }: Props) {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info')
  const [name, setName] = useState(conversation?.customer?.name || '')
  const [email, setEmail] = useState(conversation?.email_address || '')
  const [phone, setPhone] = useState(conversation?.phone_number || '')
  const [vehicleDesc, setVehicleDesc] = useState(conversation?.vehicle_info?.type || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const c = {
    bg: '#0d0f14', surface: '#161920', surface2: '#1a1d27',
    border: '#1e2330', accent: '#4f7fff', green: '#22c07a',
    amber: '#f59e0b', red: '#f25a5a', cyan: '#22d3ee',
    text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  }

  async function handleCheckout() {
    if (!name || !email) { setError('Name and email required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/deposit/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, vehicle_desc: vehicleDesc, amount, conversation_id: conversationId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.success) {
        setStep('success')
      } else {
        setError(data.error || 'Payment failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    }
    setLoading(false)
  }

  if (step === 'success') {
    return (
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${c.green}15`, border: `2px solid ${c.green}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={40} style={{ color: c.green }} />
        </div>
        <h1 style={{ fontSize: 28, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: '0 0 8px' }}>Deposit Received!</h1>
        <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, margin: '0 0 24px' }}>
          Your ${amount} design deposit has been confirmed. Our design team will begin working on your wrap project. You will receive an email with next steps.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
          {[
            { icon: <Palette size={18} />, label: 'Design begins within 48 hours', color: c.accent },
            { icon: <Clock size={18} />, label: 'Proof sent in 3-5 business days', color: c.amber },
            { icon: <Truck size={18} />, label: 'Install scheduled after approval', color: c.green },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: c.surface, borderRadius: 10, border: `1px solid ${c.border}` }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: c.text1 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      {/* Logo / Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: '0 0 4px' }}>
          USA WRAP CO
        </h1>
        <p style={{ fontSize: 14, color: c.text2, margin: 0 }}>Professional Vehicle Wraps & Graphics</p>
      </div>

      {/* Deposit Card */}
      <div style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        {/* Amount header */}
        <div style={{ padding: '20px 24px', background: `${c.accent}08`, borderBottom: `1px solid ${c.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.text3, marginBottom: 4 }}>Design Deposit</div>
          <div style={{ fontSize: 48, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: c.text1 }}>
            ${amount}
          </div>
          <div style={{ fontSize: 12, color: c.text2, marginTop: 4 }}>One-time payment to start your wrap project</div>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 24px' }}>
          {conversation?.quote_data?.total && (
            <div style={{ padding: '10px 14px', background: `${c.green}08`, border: `1px solid ${c.green}20`, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: c.green }}>Quote total: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>${conversation.quote_data.total.toLocaleString()}</strong> — Deposit: ${amount} applied to final price</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
                style={{ width: '100%', padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@business.com" type="email"
                style={{ width: '100%', padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555"
                style={{ width: '100%', padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Vehicle Description</label>
              <input value={vehicleDesc} onChange={e => setVehicleDesc(e.target.value)} placeholder="2024 Ford Transit Van"
                style={{ width: '100%', padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: `${c.red}10`, border: `1px solid ${c.red}25`, borderRadius: 6, fontSize: 12, color: c.red }}>
              {error}
            </div>
          )}

          <button onClick={handleCheckout} disabled={loading}
            style={{
              width: '100%', padding: '14px', marginTop: 16, borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${c.accent}, ${c.cyan})`,
              color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.08em', cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
            }}>
            <CreditCard size={18} />
            {loading ? 'Processing...' : `Pay $${amount} Deposit`}
            {!loading && <ArrowRight size={16} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, color: c.text3, fontSize: 11 }}>
            <Lock size={11} /> Secured by Stripe
          </div>
        </div>
      </div>

      {/* What's included */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.text3, textAlign: 'center' }}>What Your Deposit Includes</div>
        {[
          { icon: <Palette size={16} />, label: 'Custom design mockup for your vehicle' },
          { icon: <Shield size={16} />, label: 'Deposit applied to final project cost' },
          { icon: <Clock size={16} />, label: 'Priority scheduling for install' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: c.surface, borderRadius: 8, border: `1px solid ${c.border}` }}>
            <span style={{ color: c.accent }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: c.text2 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
