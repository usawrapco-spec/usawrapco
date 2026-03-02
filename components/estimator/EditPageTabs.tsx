'use client'

import { useState, type ReactNode } from 'react'
import { Calculator, FileText, ClipboardList } from 'lucide-react'

interface EditPageTabsProps {
  orderEditor: ReactNode
  lineItemsEngine: ReactNode
  surveyBuilder?: ReactNode
}

export default function EditPageTabs({ orderEditor, lineItemsEngine, surveyBuilder }: EditPageTabsProps) {
  const [mode, setMode] = useState<'classic' | 'engine' | 'survey'>('survey')

  return (
    <div>
      {/* Mode Switcher */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16, padding: 3,
        background: 'var(--surface2)', borderRadius: 10, width: 'fit-content',
      }}>
        {surveyBuilder && (
          <button
            onClick={() => setMode('survey')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: mode === 'survey' ? 'var(--accent)' : 'transparent',
              color: mode === 'survey' ? '#fff' : 'var(--text3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >
            <ClipboardList size={14} />
            Survey + Build
          </button>
        )}
        <button
          onClick={() => setMode('engine')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: mode === 'engine' ? 'var(--accent)' : 'transparent',
            color: mode === 'engine' ? '#fff' : 'var(--text3)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}
        >
          <Calculator size={14} />
          Line Items Engine
        </button>
        <button
          onClick={() => setMode('classic')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: mode === 'classic' ? 'var(--accent)' : 'transparent',
            color: mode === 'classic' ? '#fff' : 'var(--text3)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}
        >
          <FileText size={14} />
          Classic Editor
        </button>
      </div>

      {/* Content */}
      {mode === 'survey' && surveyBuilder}
      {mode === 'engine' && lineItemsEngine}
      {mode === 'classic' && orderEditor}
    </div>
  )
}
