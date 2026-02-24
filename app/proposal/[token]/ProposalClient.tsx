'use client'

import { useState, useEffect } from 'react'
import { Phone, Mail, Globe, CheckCircle2, ExternalLink, Loader2, Palette, Tag, Sparkles, ArrowRight } from 'lucide-react'

interface ProposalClientProps {
  proposal: any
  initialPortfolio?: any
}

export default function ProposalClient({ proposal, initialPortfolio }: ProposalClientProps) {
  const [portfolio, setPortfolio] = useState<any>(initialPortfolio || null)
  const [portfolioLoading, setPortfolioLoading] = useState(!initialPortfolio)
  const [approved, setApproved] = useState(false)

  // Fetch or auto-generate brand portfolio for this proposal
  useEffect(() => {
    if (initialPortfolio) return // already have it from server
    async function loadPortfolio() {
      setPortfolioLoading(true)
      try {
        // Try to find existing portfolio
        const params = new URLSearchParams()
        if (proposal.customer_id) params.set('customer_id', proposal.customer_id)
        if (proposal.project_id) params.set('project_id', proposal.project_id)

        const res = await fetch(`/api/brand-portfolio?${params}`)
        const json = await res.json()

        if (json.portfolios?.length > 0) {
          setPortfolio(json.portfolios[0])
          setPortfolioLoading(false)
          return
        }

        // Auto-generate from website if available
        if (proposal.website_url || proposal.customer_website) {
          const scrapeRes = await fetch('/api/scrape-brand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: proposal.website_url || proposal.customer_website }),
          })
          const scrapeJson = await scrapeRes.json()
          if (scrapeJson.data) {
            // Analyze and build mini portfolio in-memory (no DB save from public route)
            const analysisRes = await fetch('/api/analyze-brand', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyName: scrapeJson.data.companyName || proposal.company_name,
                url: proposal.website_url || proposal.customer_website,
                tagline: scrapeJson.data.tagline,
                colors: scrapeJson.data.colors,
                services: scrapeJson.data.services,
                aboutText: scrapeJson.data.aboutText,
              }),
            })
            const analysisJson = await analysisRes.json()
            setPortfolio({
              company_name: scrapeJson.data.companyName || proposal.company_name,
              logo_url: scrapeJson.data.logoUrl,
              tagline: scrapeJson.data.tagline,
              brand_colors: scrapeJson.data.colors || [],
              website_url: proposal.website_url || proposal.customer_website,
              phone: scrapeJson.data.phone,
              email: scrapeJson.data.email,
              ai_brand_analysis: analysisJson.analysis || null,
              _generated: true,
            })
          }
        }
      } catch { /* silent */ }
      setPortfolioLoading(false)
    }

    // Slight delay so the page renders first
    const t = setTimeout(loadPortfolio, 500)
    return () => clearTimeout(t)
  }, [proposal])

  const lineItems: any[] = proposal.line_items || []
  const subtotal = proposal.subtotal || lineItems.reduce((s: number, li: any) => s + (li.total || li.price || 0), 0)
  const tax = proposal.tax || 0
  const total = proposal.total || subtotal + tax

  let aiAnalysis: any = {}
  try {
    if (portfolio?.ai_brand_analysis) {
      aiAnalysis = typeof portfolio.ai_brand_analysis === 'string'
        ? JSON.parse(portfolio.ai_brand_analysis)
        : portfolio.ai_brand_analysis
    }
  } catch { aiAnalysis = {} }

  const primaryColor = portfolio?.brand_colors?.[0]?.hex || '#4f7fff'

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaed', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1623 0%, #1a1d27 100%)',
        borderBottom: '1px solid #1e2738',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', fontFamily: 'Barlow Condensed, sans-serif', color: '#e8eaed' }}>
          USA WRAP CO
        </div>
        <div style={{ fontSize: 12, color: '#5a6080' }}>Proposal #{proposal.id?.slice(0, 8)?.toUpperCase()}</div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Proposal Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 6 }}>
            {proposal.title || `Vehicle Wrap Proposal`}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {proposal.company_name && (
              <span style={{ fontSize: 14, color: '#9299b5' }}>
                Prepared for: <strong style={{ color: '#e8eaed' }}>{proposal.company_name}</strong>
              </span>
            )}
            {proposal.created_at && (
              <span style={{ fontSize: 14, color: '#9299b5' }}>
                {new Date(proposal.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {proposal.valid_until && (
              <span style={{ fontSize: 14, color: '#f59e0b' }}>
                Valid until: {new Date(proposal.valid_until).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* ── BRAND ANALYSIS SECTION ── */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1e2738',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 28,
        }}>
          {/* Section header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e2738',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#e8eaed' }}>
                Your Brand Analysis
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#5a6080', background: '#1a1d27', padding: '3px 8px', borderRadius: 12, border: '1px solid #1e2738' }}>
              AI-Powered
            </span>
          </div>

          <div style={{ padding: '20px' }}>
            {portfolioLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9299b5', fontSize: 13 }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#4f7fff' }} />
                Analyzing your brand...
              </div>
            ) : portfolio ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Logo + Name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {portfolio.logo_url && (
                    <img
                      src={portfolio.logo_url}
                      alt="Logo"
                      style={{ height: 48, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: '6px 10px', flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#e8eaed' }}>
                      {portfolio.company_name || proposal.company_name}
                    </div>
                    {(aiAnalysis.headline || portfolio.tagline) && (
                      <div style={{ fontSize: 13, color: '#9299b5', fontStyle: 'italic', marginTop: 2 }}>
                        "{aiAnalysis.headline || portfolio.tagline}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Colors */}
                {portfolio.brand_colors?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Palette size={14} style={{ color: '#5a6080', flexShrink: 0 }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {portfolio.brand_colors.slice(0, 5).map((c: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 4,
                            background: typeof c === 'string' ? c : c.hex,
                            border: '1px solid rgba(255,255,255,0.1)',
                          }} />
                          <span style={{ fontSize: 11, color: '#5a6080', fontFamily: 'monospace' }}>
                            {typeof c === 'string' ? c : c.hex}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand personality */}
                {aiAnalysis.brand_personality && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(79,127,255,0.05)',
                    border: '1px solid rgba(79,127,255,0.15)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#9299b5',
                    lineHeight: 1.6,
                  }}>
                    {aiAnalysis.brand_personality}
                  </div>
                )}

                {/* Keywords */}
                {aiAnalysis.brand_keywords?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {aiAnalysis.brand_keywords.map((kw: string) => (
                      <span key={kw} style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        background: `${primaryColor}18`,
                        border: `1px solid ${primaryColor}40`,
                        color: primaryColor,
                        padding: '3px 8px', borderRadius: 20,
                      }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Wrap recommendation */}
                {aiAnalysis.wrap_recommendation && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Tag size={13} style={{ color: '#22c07a', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: '#9299b5' }}>
                      <strong style={{ color: '#22c07a' }}>Wrap recommendation: </strong>
                      {aiAnalysis.wrap_recommendation}
                    </div>
                  </div>
                )}

                {/* View full portfolio link */}
                {!portfolio._generated && portfolio.id && (
                  <div style={{ borderTop: '1px solid #1e2738', paddingTop: 12, marginTop: 4 }}>
                    <a
                      href={`/brand/${portfolio.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 13, fontWeight: 700, color: '#4f7fff',
                        textDecoration: 'none',
                      }}
                    >
                      View Full Brand Portfolio
                      <ArrowRight size={13} />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#5a6080' }}>
                Brand analysis not available for this proposal.
              </div>
            )}
          </div>
        </div>

        {/* ── LINE ITEMS ── */}
        {lineItems.length > 0 && (
          <div style={{
            background: '#13151c',
            border: '1px solid #1e2738',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 28,
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2738' }}>
              <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Scope of Work
              </span>
            </div>
            <div style={{ padding: '0' }}>
              {lineItems.map((item: any, idx: number) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: idx < lineItems.length - 1 ? '1px solid #1e2738' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#e8eaed' }}>{item.name || item.description}</div>
                    {item.description && item.name && (
                      <div style={{ fontSize: 12, color: '#5a6080', marginTop: 2 }}>{item.description}</div>
                    )}
                  </div>
                  {item.quantity && item.quantity > 1 && (
                    <div style={{ fontSize: 13, color: '#9299b5', textAlign: 'right' }}>
                      {item.quantity} × ${Number(item.unit_price || item.price || 0).toLocaleString()}
                    </div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${Number(item.total || item.price || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #1e2738', background: '#0f1119' }}>
              {tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Subtotal</span>
                  <span style={{ fontSize: 13, color: '#9299b5', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${subtotal.toLocaleString()}
                  </span>
                </div>
              )}
              {tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#9299b5' }}>Tax</span>
                  <span style={{ fontSize: 13, color: '#9299b5', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${tax.toLocaleString()}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: tax > 0 ? 10 : 0, borderTop: tax > 0 ? '1px solid #1e2738' : 'none' }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── NOTES / TERMS ── */}
        {(proposal.notes || proposal.terms) && (
          <div style={{
            background: '#13151c',
            border: '1px solid #1e2738',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 28,
          }}>
            {proposal.notes && (
              <div style={{ marginBottom: proposal.terms ? 16 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a6080', marginBottom: 8 }}>Notes</div>
                <p style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.7, margin: 0 }}>{proposal.notes}</p>
              </div>
            )}
            {proposal.terms && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a6080', marginBottom: 8 }}>Terms</div>
                <p style={{ fontSize: 13, color: '#5a6080', lineHeight: 1.7, margin: 0 }}>{proposal.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* ── CTA SECTION ── */}
        <div style={{
          background: approved
            ? 'rgba(34,192,122,0.08)'
            : 'linear-gradient(135deg, rgba(79,127,255,0.08) 0%, rgba(139,92,246,0.08) 100%)',
          border: `1px solid ${approved ? 'rgba(34,192,122,0.3)' : 'rgba(79,127,255,0.2)'}`,
          borderRadius: 16,
          padding: '28px 24px',
          textAlign: 'center',
        }}>
          {approved ? (
            <div>
              <CheckCircle2 size={40} style={{ color: '#22c07a', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: '#22c07a', marginBottom: 4 }}>Proposal Approved!</div>
              <div style={{ fontSize: 14, color: '#9299b5' }}>Our team has been notified. We'll reach out shortly to get started.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Ready to bring your brand to the road?</div>
              <div style={{ fontSize: 14, color: '#9299b5', marginBottom: 24 }}>
                Approve this proposal to get started. We'll schedule your installation within days.
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setApproved(true)}
                  style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #22c07a, #16a35e)',
                    border: 'none', borderRadius: 10,
                    fontWeight: 800, fontSize: 15, color: '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <CheckCircle2 size={17} />
                  Approve Proposal
                </button>
                <a
                  href={`tel:${proposal.rep_phone || ''}`}
                  style={{
                    padding: '14px 24px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    fontWeight: 700, fontSize: 14, color: '#e8eaed',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={15} />
                  Call Us
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: '#3a4060' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>USA WRAP CO</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {proposal.rep_phone && (
              <a href={`tel:${proposal.rep_phone}`} style={{ color: '#3a4060', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} />{proposal.rep_phone}
              </a>
            )}
            {proposal.rep_email && (
              <a href={`mailto:${proposal.rep_email}`} style={{ color: '#3a4060', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={11} />{proposal.rep_email}
              </a>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
