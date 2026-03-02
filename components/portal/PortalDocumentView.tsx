'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Download, MessageSquare, CreditCard, CheckCircle,
  Phone, Mail, MapPin, FileText, Calendar, Hash,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  category?: string | null
}

interface Document {
  id: string
  number?: string | null
  estimate_number?: string | null
  invoice_number?: string | null
  order_number?: string | null
  status?: string | null
  total?: number | null
  subtotal?: number | null
  tax?: number | null
  deposit?: number | null
  balance_due?: number | null
  notes?: string | null
  terms?: string | null
  due_date?: string | null
  valid_until?: string | null
  created_at: string
  line_items?: LineItem[]
}

interface Props {
  docType: 'estimate' | 'invoice' | 'sales_order'
  customer: { id: string; name: string; email: string | null; phone: string | null; company_name?: string | null }
  project: { id: string; title: string; vehicle_desc: string | null }
  document: Document | null
  orgName: string
  orgPhone: string | null
  orgEmail: string | null
  orgAddress: string | null
  token: string
}

const DOC_LABELS: Record<string, { title: string; numberField: string; color: string }> = {
  estimate:    { title: 'Estimate',     numberField: 'estimate_number', color: '#4f7fff' },
  invoice:     { title: 'Invoice',      numberField: 'invoice_number',  color: '#22c07a' },
  sales_order: { title: 'Sales Order',  numberField: 'order_number',    color: '#8b5cf6' },
}

function money(n: number | null | undefined) {
  return `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PortalDocumentView({
  docType, customer, project, document, orgName, orgPhone, orgEmail, orgAddress, token,
}: Props) {
  const [printing, setPrinting] = useState(false)
  const cfg = DOC_LABELS[docType]
  const base = `/portal/${token}`

  const docNumber = document?.estimate_number || document?.invoice_number || document?.order_number || document?.number
  const lineItems: LineItem[] = document?.line_items || []
  const subtotal = document?.subtotal ?? lineItems.reduce((s, li) => s + (li.total ?? 0), 0)
  const tax = document?.tax ?? 0
  const total = document?.total ?? subtotal + tax
  const balanceDue = document?.balance_due ?? total
  const isInvoice = docType === 'invoice'
  const isPaid = document?.status === 'paid'

  function handlePrint() {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 100)
  }

  if (!document) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: C.text3 }}>
        <FileText size={36} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>No {cfg.title} Found</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>This document has not been created yet.</div>
        <Link href={`${base}/jobs/${project.id}`} style={{
          display: 'inline-block',
          marginTop: 20,
          padding: '10px 20px',
          background: C.accent,
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Back to Job
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Top action bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <Link
          href={`${base}/jobs/${project.id}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.text2, textDecoration: 'none', fontSize: 14 }}
        >
          <ChevronLeft size={18} />
          Back
        </Link>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handlePrint}
            disabled={printing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text1,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            Download PDF
          </button>

          <Link
            href={`${base}/messages`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text1,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <MessageSquare size={15} />
            Ask a Question
          </Link>

          {isInvoice && !isPaid && balanceDue > 0 && (
            <Link
              href={`${base}/invoices`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#22c07a',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <CreditCard size={15} />
              Pay Now
            </Link>
          )}

          {isInvoice && isPaid && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: `${'#22c07a'}15`,
              border: `1px solid ${'#22c07a'}30`,
              color: '#22c07a',
              fontSize: 13,
              fontWeight: 600,
            }}>
              <CheckCircle size={15} />
              Paid
            </div>
          )}
        </div>
      </div>

      {/* Document body */}
      <div style={{ padding: '28px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          {/* Org branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 1,
                color: cfg.color,
                textTransform: 'uppercase',
                fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
              }}>
                {orgName}
              </div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                American Craftsmanship You Can Trust™
              </div>
              {orgAddress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: C.text2 }}>
                  <MapPin size={12} />
                  {orgAddress}
                </div>
              )}
              {orgPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 12, color: C.text2 }}>
                  <Phone size={12} />
                  {orgPhone}
                </div>
              )}
              {orgEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 12, color: C.text2 }}>
                  <Mail size={12} />
                  {orgEmail}
                </div>
              )}
            </div>

            {/* Document type + status */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: cfg.color,
                fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                {cfg.title}
              </div>
              {docNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4, fontSize: 12, color: C.text2 }}>
                  <Hash size={12} />
                  {docNumber}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4, fontSize: 12, color: C.text2 }}>
                <Calendar size={12} />
                {fmtDate(document.created_at)}
              </div>
              {document.due_date && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#f25a5a', fontWeight: 600 }}>
                  Due: {fmtDate(document.due_date)}
                </div>
              )}
              {document.valid_until && (
                <div style={{ marginTop: 6, fontSize: 12, color: C.text3 }}>
                  Valid until: {fmtDate(document.valid_until)}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: C.border, marginBottom: 24 }} />

          {/* Bill To + Job Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.text3, textTransform: 'uppercase', marginBottom: 8 }}>
                Bill To
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1 }}>
                {customer.company_name || customer.name}
              </div>
              {customer.company_name && (
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{customer.name}</div>
              )}
              {customer.email && (
                <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{customer.email}</div>
              )}
              {customer.phone && (
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{customer.phone}</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.text3, textTransform: 'uppercase', marginBottom: 8 }}>
                Job Details
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{project.title}</div>
              {project.vehicle_desc && (
                <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{project.vehicle_desc}</div>
              )}
            </div>
          </div>
        </div>

        {/* Status banner for paid invoices */}
        {isInvoice && isPaid && (
          <div style={{
            background: `${'#22c07a'}12`,
            border: `1px solid ${'#22c07a'}30`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#22c07a',
            fontSize: 14,
            fontWeight: 600,
          }}>
            <CheckCircle size={18} />
            This invoice has been paid in full. Thank you!
          </div>
        )}

        {/* Line items table */}
        {lineItems.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 12,
              padding: '8px 12px',
              background: C.surface2,
              borderRadius: '8px 8px 0 0',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: C.text3,
              textTransform: 'uppercase',
            }}>
              <div>Description</div>
              <div style={{ textAlign: 'right' }}>Qty</div>
              <div style={{ textAlign: 'right' }}>Unit Price</div>
              <div style={{ textAlign: 'right' }}>Total</div>
            </div>

            {/* Line items */}
            <div style={{ border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {lineItems.map((li, i) => (
                <div
                  key={li.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: 12,
                    padding: '12px',
                    borderBottom: i < lineItems.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: i % 2 === 0 ? 'transparent' : `${C.surface2}50`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: C.text1 }}>{li.description}</div>
                    {li.category && (
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{li.category}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: C.text2, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                    {li.quantity ?? 1}
                  </div>
                  <div style={{ fontSize: 13, color: C.text2, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                    {money(li.unit_price)}
                  </div>
                  <div style={{ fontSize: 13, color: C.text1, textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                    {money(li.total ?? (li.unit_price * (li.quantity ?? 1)))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '24px',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            textAlign: 'center',
            color: C.text3,
            fontSize: 13,
            marginBottom: 24,
          }}>
            Line items will appear here once finalized.
          </div>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 280 }}>
            {[
              { label: 'Subtotal', value: money(subtotal), muted: true },
              tax > 0 ? { label: 'Tax', value: money(tax), muted: true } : null,
              document.deposit && document.deposit > 0 ? { label: 'Deposit Paid', value: `-${money(document.deposit)}`, muted: true } : null,
              { label: docType === 'invoice' ? 'Balance Due' : 'Total', value: money(balanceDue), highlight: true },
            ].filter(Boolean).map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: row!.highlight ? 'none' : `1px solid ${C.border}`,
                  borderTop: row!.highlight ? `2px solid ${C.border}` : 'none',
                  marginTop: row!.highlight ? 4 : 0,
                }}
              >
                <span style={{ fontSize: row!.highlight ? 15 : 13, color: row!.highlight ? C.text1 : C.text2, fontWeight: row!.highlight ? 700 : 400 }}>
                  {row!.label}
                </span>
                <span style={{
                  fontSize: row!.highlight ? 16 : 13,
                  color: row!.highlight ? cfg.color : C.text2,
                  fontWeight: row!.highlight ? 800 : 500,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {row!.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes + Terms */}
        {(document.notes || document.terms) && (
          <div style={{ marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
            {document.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.text3, textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{document.notes}</div>
              </div>
            )}
            {document.terms && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.text3, textTransform: 'uppercase', marginBottom: 6 }}>Terms & Conditions</div>
                <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{document.terms}</div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text3 }}>
            Thank you for choosing <span style={{ color: cfg.color, fontWeight: 600 }}>{orgName}</span>
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
            Questions? Message us in the portal or call {orgPhone || 'us'}.
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          header, nav, button, a[href] { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
