'use client'

import { useState } from 'react'
import { Plus, Trash2, Eye, FileText, Check } from 'lucide-react'
import type { LineItemState, Proposal } from '@/lib/estimator/types'
import { calcLineItem, calcTotals } from '@/lib/estimator/pricing'

interface ProposalBuilderProps {
  items: LineItemState[]
  proposals: Proposal[]
  onProposalsChange: (proposals: Proposal[]) => void
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fP = (n: number) => Math.round(n) + '%'

function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

export default function ProposalBuilder({ items, proposals, onProposalsChange }: ProposalBuilderProps) {
  const [previewId, setPreviewId] = useState<string | null>(null)

  function addProposal() {
    const name = `Option ${String.fromCharCode(65 + proposals.length)}`
    const newProposal: Proposal = {
      id: crypto.randomUUID(),
      name,
      itemIds: [],
    }
    onProposalsChange([...proposals, newProposal])
  }

  function removeProposal(id: string) {
    onProposalsChange(proposals.filter(p => p.id !== id))
    if (previewId === id) setPreviewId(null)
  }

  function updateProposalName(id: string, name: string) {
    onProposalsChange(proposals.map(p => p.id === id ? { ...p, name } : p))
  }

  function toggleItem(proposalId: string, itemId: string) {
    onProposalsChange(proposals.map(p => {
      if (p.id !== proposalId) return p
      const has = p.itemIds.includes(itemId)
      return { ...p, itemIds: has ? p.itemIds.filter(i => i !== itemId) : [...p.itemIds, itemId] }
    }))
  }

  function getProposalTotals(proposal: Proposal) {
    const proposalItems = items.filter(i => proposal.itemIds.includes(i.id))
    return calcTotals(proposalItems)
  }

  const previewProposal = previewId ? proposals.find(p => p.id === previewId) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: 'var(--text1)',
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Proposals
        </div>
        <button
          onClick={addProposal}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: 'var(--accent)', border: 'none', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase',
          }}
        >
          <Plus size={14} />
          Add Proposal
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: previewProposal ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Proposals List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {proposals.length === 0 && (
            <div style={{
              padding: '32px 24px', textAlign: 'center', borderRadius: 12,
              border: '2px dashed var(--border)', color: 'var(--text3)', fontSize: 13,
            }}>
              <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              No proposals yet. Create one to group line items.
            </div>
          )}

          {proposals.map(proposal => {
            const totals = getProposalTotals(proposal)
            return (
              <div
                key={proposal.id}
                style={{
                  borderRadius: 10, padding: 16,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}
              >
                {/* Proposal Header */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    value={proposal.name}
                    onChange={e => updateProposalName(proposal.id, e.target.value)}
                    style={{
                      flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '6px 10px', fontSize: 14, fontWeight: 700,
                      color: 'var(--text1)', outline: 'none',
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}
                  />
                  <button
                    onClick={() => setPreviewId(previewId === proposal.id ? null : proposal.id)}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      background: previewId === proposal.id ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                      color: previewId === proposal.id ? 'var(--accent)' : 'var(--text3)',
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => removeProposal(proposal.id)}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid var(--red)',
                      background: 'rgba(242,90,90,0.08)', color: 'var(--red)', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Item Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((item, i) => {
                    const isIncluded = proposal.itemIds.includes(item.id)
                    const calc = item._calc || calcLineItem(item)
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(proposal.id, item.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          border: isIncluded ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isIncluded ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: isIncluded ? 'none' : '1px solid var(--border)',
                          background: isIncluded ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isIncluded && <Check size={12} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>
                          {item.name || `Item ${i + 1}`}
                        </span>
                        <span style={{
                          fontSize: 12, color: 'var(--text2)', fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {fM(calc.salePrice)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Proposal Totals */}
                {proposal.itemIds.length > 0 && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px', borderRadius: 8,
                    background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                      {proposal.itemIds.length} items
                    </span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 14, fontWeight: 800, color: 'var(--text1)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {fM(totals.totalRevenue)}
                      </span>
                      <span style={{
                        padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800,
                        background: `${gpmColor(totals.blendedGPM)}15`,
                        color: gpmColor(totals.blendedGPM),
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {fP(totals.blendedGPM)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Customer Preview Panel */}
        {previewProposal && (
          <div style={{
            borderRadius: 12, padding: 20,
            background: '#fff', color: '#1a1a2e', border: '1px solid #e0e0e0',
          }}>
            <div style={{
              fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase',
            }}>
              {previewProposal.name}
            </div>
            <div style={{ fontSize: 11, color: '#777', marginBottom: 16 }}>USA WRAP CO</div>

            {items
              .filter(i => previewProposal.itemIds.includes(i.id))
              .map((item, i) => {
                const calc = item._calc || calcLineItem(item)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid #eee',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                        {item.name || `Item ${i + 1}`}
                      </div>
                      <div style={{ fontSize: 11, color: '#777' }}>
                        {item.type === 'ppf' ? 'Paint Protection Film' : `${item.sqft} sqft`}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 800, color: '#1a1a2e',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {fM(calc.salePrice)}
                    </div>
                  </div>
                )
              })}

            {/* Total */}
            {(() => {
              const totals = getProposalTotals(previewProposal)
              return (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 0', marginTop: 8,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>TOTAL</span>
                  <span style={{
                    fontSize: 24, fontWeight: 800, color: '#1a1a2e',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {fM(totals.totalRevenue)}
                  </span>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
