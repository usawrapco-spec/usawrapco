'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Mail, MessageSquare, Send, Paperclip, FileText, Loader2, AlertTriangle, Plus } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EmailData {
  to: string
  cc: string
  subject: string
  message: string
  attachPdf: boolean
  attachTerms: boolean
  sendVia: 'email' | 'sms' | 'both'
}

interface EmailComposeModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (data: EmailData) => void
  recipientEmail?: string
  recipientName?: string
  senderName?: string
  senderEmail?: string
  subject?: string
  estimateNumber?: string | number
  estimateTotal?: number
  vehicleDescription?: string
  viewUrl?: string
  type?: 'estimate' | 'invoice' | 'proof' | 'general'
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function buildDefaultSubject(
  type: EmailComposeModalProps['type'],
  estimateNumber?: string | number,
): string {
  switch (type) {
    case 'estimate':
      return estimateNumber
        ? `Your Wrap Estimate from USA Wrap Co \u2014 QT #${estimateNumber}`
        : 'Your Wrap Estimate from USA Wrap Co'
    case 'invoice':
      return estimateNumber
        ? `Invoice from USA Wrap Co \u2014 INV #${estimateNumber}`
        : 'Invoice from USA Wrap Co'
    case 'proof':
      return 'Design Proof Ready for Review \u2014 USA Wrap Co'
    case 'general':
    default:
      return ''
  }
}

function buildDefaultMessage(
  type: EmailComposeModalProps['type'],
  recipientName?: string,
  senderName?: string,
  vehicleDescription?: string,
  estimateTotal?: number,
  viewUrl?: string,
): string {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  const closing = senderName ? `Best,\n${senderName}\nUSA Wrap Co` : 'Best,\nUSA Wrap Co'
  const vehicleLine = vehicleDescription ? ` for the ${vehicleDescription}` : ''
  const totalLine = estimateTotal != null ? `\nTotal: ${formatCurrency(estimateTotal)}\n` : ''
  const linkLine = viewUrl ? '\nClick below to review and accept:\n[View Estimate]\n' : ''

  switch (type) {
    case 'estimate':
      return [
        greeting,
        '',
        `Thanks for reaching out! Here\u2019s your custom estimate${vehicleLine}.`,
        linkLine ? linkLine.trim() : '',
        totalLine ? totalLine.trim() : '',
        '',
        'Let me know if you have any questions!',
        '',
        closing,
      ]
        .filter((line, i, arr) => {
          // collapse consecutive empty strings
          if (line === '' && i > 0 && arr[i - 1] === '') return false
          return true
        })
        .join('\n')

    case 'invoice':
      return [
        greeting,
        '',
        `Please find your invoice${vehicleLine} from USA Wrap Co attached.`,
        totalLine ? totalLine.trim() : '',
        '',
        viewUrl ? 'You can view and pay online using the link below:\n[View Invoice]\n' : '',
        'If you have any questions about this invoice, feel free to reach out.',
        '',
        closing,
      ]
        .filter((line, i, arr) => {
          if (line === '' && i > 0 && arr[i - 1] === '') return false
          return true
        })
        .join('\n')

    case 'proof':
      return [
        greeting,
        '',
        `Your design proof${vehicleLine} is ready for review!`,
        '',
        viewUrl ? 'Click below to view the proof and leave feedback:\n[View Proof]\n' : '',
        'Please review and let us know if you\u2019d like any changes or if we\u2019re good to go.',
        '',
        closing,
      ]
        .filter((line, i, arr) => {
          if (line === '' && i > 0 && arr[i - 1] === '') return false
          return true
        })
        .join('\n')

    case 'general':
    default:
      return [greeting, '', '', '', closing].join('\n')
  }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function EmailComposeModal({
  isOpen,
  onClose,
  onSend,
  recipientEmail = '',
  recipientName,
  senderName,
  senderEmail,
  subject: subjectProp,
  estimateNumber,
  estimateTotal,
  vehicleDescription,
  viewUrl,
  type = 'estimate',
}: EmailComposeModalProps) {
  const [to, setTo] = useState(recipientEmail)
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachPdf, setAttachPdf] = useState(true)
  const [attachTerms, setAttachTerms] = useState(true)
  const [sendVia, setSendVia] = useState<'email' | 'sms' | 'both'>('email')
  const [sending, setSending] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Reset form when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setTo(recipientEmail)
      setCc('')
      setShowCc(false)
      setSubject(subjectProp || buildDefaultSubject(type, estimateNumber))
      setMessage(
        buildDefaultMessage(type, recipientName, senderName, vehicleDescription, estimateTotal, viewUrl),
      )
      setAttachPdf(true)
      setAttachTerms(type === 'estimate' || type === 'invoice')
      setSendVia('email')
      setSending(false)
    }
  }, [isOpen, recipientEmail, recipientName, senderName, subjectProp, estimateNumber, estimateTotal, vehicleDescription, viewUrl, type])

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    },
    [isOpen, onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus trap — focus modal on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const typeLabels: Record<string, string> = {
    estimate: 'Estimate',
    invoice: 'Invoice',
    proof: 'Proof',
    general: 'Email',
  }
  const typeLabel = typeLabels[type] || 'Email'

  const canSend = to.trim().length > 0 && subject.trim().length > 0 && !sending

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      await onSend({
        to: to.trim(),
        cc: cc.trim(),
        subject: subject.trim(),
        message,
        attachPdf,
        attachTerms,
        sendVia,
      })
    } catch {
      // Parent handles error
    } finally {
      setSending(false)
    }
  }

  const sendChannels: { key: 'email' | 'sms' | 'both'; label: string; icon: typeof Mail }[] = [
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'sms', label: 'SMS', icon: MessageSquare },
    { key: 'both', label: 'Both', icon: Send },
  ]

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  }

  const modalStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 0,
    maxWidth: 640,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
    outline: 'none',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  }

  const headingStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 900,
    color: 'var(--text1)',
    fontFamily: 'Barlow Condensed, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  }

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text3)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    transition: 'color 200ms, background 200ms',
  }

  const bodyStyle: React.CSSProperties = {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: 'Barlow Condensed, sans-serif',
    marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text1)',
    outline: 'none',
    transition: 'border-color 200ms, box-shadow 200ms',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const inputReadonlyStyle: React.CSSProperties = {
    ...inputStyle,
    color: 'var(--text3)',
    cursor: 'default',
    opacity: 0.7,
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 200,
    resize: 'vertical' as const,
    lineHeight: 1.6,
    fontFamily: 'inherit',
  }

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  }

  const cancelButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text2)',
    transition: 'background 200ms, color 200ms',
  }

  const sendButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 13,
    cursor: canSend ? 'pointer' : 'not-allowed',
    background: 'var(--green)',
    border: 'none',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: canSend ? 1 : 0.5,
    transition: 'opacity 200ms, filter 200ms',
    filter: canSend ? 'brightness(1)' : 'brightness(0.8)',
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={headingStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} style={{ color: 'var(--accent)' }} />
              Send {typeLabel} to Customer
            </span>
          </h2>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text1)'
              e.currentTarget.style.background = 'var(--surface2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text3)'
              e.currentTarget.style.background = 'none'
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {/* To field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={labelStyle}>To</div>
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                    transition: 'opacity 200ms',
                  }}
                >
                  <Plus size={12} />
                  Add CC
                </button>
              )}
            </div>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,127,255,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* CC field (conditional) */}
          {showCc && (
            <div>
              <div style={labelStyle}>CC</div>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,127,255,0.15)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
          )}

          {/* From field (read-only) */}
          {senderEmail && (
            <div>
              <div style={labelStyle}>From</div>
              <input
                type="text"
                value={senderEmail}
                readOnly
                style={inputReadonlyStyle}
              />
            </div>
          )}

          {/* Subject field */}
          <div>
            <div style={labelStyle}>Subject</div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,127,255,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Message textarea */}
          <div>
            <div style={labelStyle}>Message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              style={textareaStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,127,255,0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Attachments */}
          <div>
            <div style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Paperclip size={12} />
                Attachments
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Include PDF */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--text2)',
                  userSelect: 'none',
                }}
              >
                <span
                  onClick={() => setAttachPdf(!attachPdf)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `2px solid ${attachPdf ? 'var(--accent)' : 'var(--border)'}`,
                    background: attachPdf ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 200ms',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {attachPdf && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <FileText size={14} style={{ color: 'var(--text3)' }} />
                Include PDF
              </label>

              {/* Include Terms */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--text2)',
                  userSelect: 'none',
                }}
              >
                <span
                  onClick={() => setAttachTerms(!attachTerms)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `2px solid ${attachTerms ? 'var(--accent)' : 'var(--border)'}`,
                    background: attachTerms ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 200ms',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {attachTerms && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <FileText size={14} style={{ color: 'var(--text3)' }} />
                Include Terms &amp; Conditions
              </label>
            </div>
          </div>

          {/* Send via radio group */}
          <div>
            <div style={labelStyle}>Send via</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {sendChannels.map((ch) => {
                const isActive = sendVia === ch.key
                const Icon = ch.icon
                return (
                  <button
                    key={ch.key}
                    onClick={() => setSendVia(ch.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: '2px solid',
                      background: isActive ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                      borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                      color: isActive ? 'var(--accent)' : 'var(--text2)',
                      transition: 'all 200ms',
                    }}
                  >
                    {/* Custom radio circle */}
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--text3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 200ms',
                        flexShrink: 0,
                      }}
                    >
                      {isActive && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                          }}
                        />
                      )}
                    </span>
                    <Icon size={14} />
                    {ch.label}
                  </button>
                )
              })}
            </div>

            {/* Twilio warning for SMS */}
            {(sendVia === 'sms' || sendVia === 'both') && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
                  SMS requires Twilio configuration. Ensure your Twilio credentials are set in Settings before sending.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            onClick={onClose}
            style={cancelButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface2)'
              e.currentTarget.style.color = 'var(--text1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text2)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={sendButtonStyle}
            onMouseEnter={(e) => {
              if (canSend) e.currentTarget.style.filter = 'brightness(0.9)'
            }}
            onMouseLeave={(e) => {
              if (canSend) e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            {sending ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Sending...
              </>
            ) : (
              <>
                Send {typeLabel}
                <Send size={14} />
              </>
            )}
          </button>
        </div>

        {/* Spin keyframes for loader */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
