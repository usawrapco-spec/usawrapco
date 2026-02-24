'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, Profile } from '@/types'
import { X, DollarSign } from 'lucide-react'

interface Props {
  invoice: Invoice
  profile: Profile
  onClose: () => void
  onSuccess: () => void
}

export default function RecordPaymentModal({ invoice, profile, onClose, onSuccess }: Props) {
  const supabase = createClient()

  const balance = invoice.balance || 0
  const [amount, setAmount] = useState(balance.toFixed(2))
  const [method, setMethod] = useState<'cash' | 'check' | 'card' | 'stripe' | 'zelle' | 'venmo' | 'ach' | 'wire' | 'other'>('card')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    if (paymentAmount > balance) {
      if (!confirm(`Payment amount ($${paymentAmount.toFixed(2)}) exceeds balance ($${balance.toFixed(2)}). Continue?`)) {
        return
      }
    }

    setLoading(true)
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          org_id: invoice.org_id,
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          amount: paymentAmount,
          method,
          reference_number: referenceNumber || null,
          notes: notes || null,
          recorded_by: profile.id,
          payment_date: paymentDate
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Calculate new amounts
      const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount
      const newBalance = (invoice.total || 0) - newAmountPaid

      // Determine new status
      let newStatus: 'open' | 'partial' | 'paid' | 'overdue' | 'void' = 'open'
      if (newBalance <= 0) {
        newStatus = 'paid'
      } else if (newAmountPaid > 0) {
        newStatus = 'partial'
      }

      // Update invoice
      const updateData: any = {
        amount_paid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newBalance <= 0) {
        updateData.paid_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id)

      if (updateError) throw updateError

      onSuccess()
    } catch (err) {
      console.error('Record payment error:', err)
      alert('Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface)',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '100%'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--surface2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text1)',
            margin: 0,
            fontFamily: 'Barlow Condensed, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <DollarSign size={24} />
            Record Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '24px' }}>
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--surface2)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>Invoice Balance</div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--accent)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              ${balance.toFixed(2)}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text3)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              Payment Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--surface2)',
                color: 'var(--text1)',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text3)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              Payment Method *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              required
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--surface2)',
                color: 'var(--text1)',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="card">Credit/Debit Card</option>
              <option value="stripe">Stripe</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="ach">ACH Transfer</option>
              <option value="wire">Wire Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text3)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Check number, transaction ID, etc."
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--surface2)',
                color: 'var(--text1)',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text3)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--surface2)',
                color: 'var(--text1)',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text3)',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this payment..."
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--surface2)',
                color: 'var(--text1)',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--surface2)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--bg)'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--surface2)',
              color: 'var(--text2)',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--green)',
              border: 'none',
              color: '#000',
              padding: '10px 24px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}
