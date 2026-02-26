'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Estimate } from '@/types'
import { X, CheckSquare, Square } from 'lucide-react'

interface Props {
  estimate: Estimate
  onClose: () => void
  onSuccess: (soId: string) => void
  employees: any[]
}

type ConvertMode = 'separate' | 'combined'

export default function ConvertToSOModal({ estimate, onClose, onSuccess, employees }: Props) {
  const supabase = createClient()

  const [mode, setMode] = useState<ConvertMode>('combined')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [productionManagerId, setProductionManagerId] = useState('')
  const [notes, setNotes] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)

  const lineItems = estimate.line_items || []

  const toggleItem = (index: number) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  const toggleAll = () => {
    if (selectedItems.length === lineItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(lineItems.map((_, idx) => idx))
    }
  }

  const handleConvert = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one line item')
      return
    }

    setLoading(true)
    try {
      const selectedLineItems = selectedItems.map(idx => lineItems[idx])

      // Create sales order
      const soData: any = {
        org_id: estimate.org_id,
        estimate_id: estimate.id,
        customer_id: estimate.customer_id,
        contact_id: estimate.contact_id,
        sales_rep_id: estimate.sales_rep_id,
        production_manager_id: productionManagerId || estimate.production_manager_id,
        project_manager_id: estimate.project_manager_id,
        line_items: selectedLineItems,
        subtotal: selectedLineItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0),
        discount_percent: estimate.discount_percent,
        discount_amount: estimate.discount_amount,
        tax_percent: estimate.tax_percent,
        tax_amount: selectedLineItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) * (estimate.tax_percent / 100),
        status: 'new',
        notes: notes || estimate.notes,
        internal_notes: estimate.internal_notes,
        tags: estimate.tags,
        due_date: dueDate || estimate.due_date,
        created_by: estimate.created_by
      }

      // Calculate total
      soData.total = soData.subtotal - soData.discount_amount + soData.tax_amount

      const { data: salesOrder, error: soError } = await supabase
        .from('sales_orders')
        .insert(soData)
        .select()
        .single()

      if (soError) throw soError

      // Update estimate to mark as ordered
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          ordered: true,
          converted_to_so_id: salesOrder.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', estimate.id)

      if (updateError) throw updateError

      // Create jobs if mode is separate
      if (mode === 'separate') {
        const jobPromises = selectedLineItems.map(async (item: any) => {
          return supabase.from('projects').insert({
            org_id: estimate.org_id,
            title: item.name || 'Job from SO',
            customer_id: estimate.customer_id,
            sales_rep_id: estimate.sales_rep_id,
            production_manager_id: productionManagerId || estimate.production_manager_id,
            status: 'open',
            pipe_stage: 'sales_in',
            division: 'wraps',
            revenue: item.total_price,
            form_data: {
              estimate_id: estimate.id,
              so_id: salesOrder.id,
              line_item: item
            }
          })
        })
        await Promise.all(jobPromises)
      } else {
        // Create single combined job
        await supabase.from('projects').insert({
          org_id: estimate.org_id,
          title: `Job from ${estimate.estimate_number}`,
          customer_id: estimate.customer_id,
          sales_rep_id: estimate.sales_rep_id,
          production_manager_id: productionManagerId || estimate.production_manager_id,
          status: 'open',
          pipe_stage: 'sales_in',
          division: 'wraps',
          revenue: soData.total,
          form_data: {
            estimate_id: estimate.id,
            so_id: salesOrder.id,
            line_items: selectedLineItems
          }
        })
      }

      onSuccess(salesOrder.id)
    } catch (err) {
      console.error('Convert to SO error:', err)
      alert('Failed to convert estimate to sales order')
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
      <div style={{
        background: 'var(--surface)',
        borderRadius: '8px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
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
            fontFamily: 'Barlow Condensed, sans-serif'
          }}>
            Convert {estimate.estimate_number} to Sales Order
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text3)',
            cursor: 'pointer',
            padding: '4px'
          }}>
            <X size={24} />
          </button>
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--surface2)',
          background: 'var(--bg)'
        }}>
          <button
            onClick={() => setMode('combined')}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'combined' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: mode === 'combined' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mode === 'combined' ? 'var(--text1)' : 'var(--text2)',
              fontSize: '14px',
              fontWeight: mode === 'combined' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Combine Line Items Into Single Job
          </button>
          <button
            onClick={() => setMode('separate')}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'separate' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: mode === 'separate' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mode === 'separate' ? 'var(--text1)' : 'var(--text2)',
              fontSize: '14px',
              fontWeight: mode === 'separate' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Create Job for Each Line Item
          </button>
        </div>

        {/* CONTENT */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          <div style={{
            fontSize: '13px',
            color: 'var(--text2)',
            marginBottom: '16px'
          }}>
            {mode === 'combined'
              ? 'All checked items will be combined into a single job.'
              : 'Each checked line item will become its own job.'
            }
          </div>

          {/* LINE ITEM SELECTION */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--surface2)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            {/* HEADER ROW */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 80px 100px 100px',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--surface2)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--surface2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--text2)'
                  }}
                >
                  {selectedItems.length === lineItems.length ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </div>
              <div>#</div>
              <div>Qty</div>
              <div>Unit Price</div>
              <div>Total</div>
            </div>

            {/* LINE ITEMS */}
            {lineItems.map((item: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 80px 100px 100px',
                  gap: '12px',
                  padding: '16px',
                  borderBottom: idx < lineItems.length - 1 ? '1px solid var(--surface2)' : 'none',
                  background: selectedItems.includes(idx) ? 'rgba(79, 127, 255, 0.1)' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => toggleItem(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleItem(idx)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: selectedItems.includes(idx) ? 'var(--accent)' : 'var(--text3)'
                    }}
                  >
                    {selectedItems.includes(idx) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </div>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text1)',
                    marginBottom: '4px'
                  }}>
                    {item.name || `Item ${idx + 1}`}
                  </div>
                  {item.description && (
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text3)'
                    }}>
                      {item.description}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text2)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  {item.quantity || 1}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text2)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  ${(item.unit_price || 0).toFixed(2)}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  ${(item.total_price || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* EDIT TRANSACTION INFO */}
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            style={{
              background: 'transparent',
              border: '1px solid var(--surface2)',
              color: 'var(--text2)',
              padding: '10px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px',
              width: '100%',
              textAlign: 'left'
            }}
          >
            {showEditForm ? '− ' : '+ '}Edit Transaction Information
          </button>

          {showEditForm && (
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--surface2)',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--text3)',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface2)',
                    color: 'var(--text1)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--text3)',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}>
                  Production Manager
                </label>
                <select
                  value={productionManagerId}
                  onChange={(e) => setProductionManagerId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface2)',
                    color: 'var(--text1)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select...</option>
                  {employees
                    .filter(e => e.division === 'production' || e.role === 'admin' || e.role === 'owner')
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))
                  }
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--text3)',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface2)',
                    color: 'var(--text1)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder="Additional notes for this sales order..."
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--surface2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg)'
        }}>
          <div style={{
            fontSize: '14px',
            color: 'var(--text3)'
          }}>
            {selectedItems.length === 0 && 'Select items first...'}
            {selectedItems.length > 0 && mode === 'separate' && `Will create ${selectedItems.length} jobs`}
            {selectedItems.length > 0 && mode === 'combined' && `Will create 1 job with ${selectedItems.length} items`}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
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
              onClick={handleConvert}
              disabled={loading || selectedItems.length === 0}
              style={{
                background: selectedItems.length === 0 ? 'var(--surface2)' : 'var(--accent)',
                border: 'none',
                color: selectedItems.length === 0 ? 'var(--text3)' : '#fff',
                padding: '10px 24px',
                borderRadius: '4px',
                cursor: loading || selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {loading ? 'Creating...' : mode === 'separate' ? `Create ${selectedItems.length} Jobs` : 'Create 1 Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
