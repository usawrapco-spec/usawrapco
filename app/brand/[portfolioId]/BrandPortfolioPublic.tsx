'use client'

import { useState } from 'react'
import BrandPortfolio from '@/components/branding/BrandPortfolio'

export default function BrandPortfolioPublic({ portfolio, editMode }: { portfolio: any; editMode: boolean }) {
  const [saved, setSaved] = useState(false)

  const handleSaveEdits = async (customerEdits: any) => {
    await fetch(`/api/brand-portfolio/${portfolio.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_edits: customerEdits }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      {saved && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#22c07a', color: '#0d1a0d', padding: '10px 20px',
          borderRadius: 20, fontWeight: 700, fontSize: 13, zIndex: 1000,
          boxShadow: '0 4px 20px rgba(34,192,122,0.4)',
        }}>
          Changes saved
        </div>
      )}
      <BrandPortfolio portfolio={portfolio} editMode={editMode} onSaveEdits={handleSaveEdits} />
    </div>
  )
}
