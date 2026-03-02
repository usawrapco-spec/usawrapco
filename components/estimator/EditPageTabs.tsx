'use client'

import { useState, type ReactNode } from 'react'
import { Calculator, FileText, ClipboardList, ClipboardCheck } from 'lucide-react'

interface EditPageTabsProps {
  orderEditor: ReactNode
  lineItemsEngine: ReactNode
  surveyBuilder?: ReactNode
  intakeSurvey?: ReactNode
}

export default function EditPageTabs({ orderEditor, lineItemsEngine, surveyBuilder, intakeSurvey }: EditPageTabsProps) {
  const [mode, setMode] = useState<'intake' | 'classic' | 'engine' | 'survey'>(intakeSurvey ? 'intake' : 'survey')

  return (
    <div>
      {/* Mode Switcher */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16, padding: 3,
        background: 'var(--surface2)', borderRadius: 10, width: 'fit-content',
      }}>
        {intakeSurvey && (
          <button
            onClick={() => setMode('intake')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: mode === 'intake' ? 'var(--accent)' : 'transparent',
              color: mode === 'intake' ? '#fff' : 'var(--text3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >
            <ClipboardCheck size={14} />
            Intake Survey
          </button>
        )}
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
            Vehicle Builder
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
      {mode === 'intake' && intakeSurvey}
      {mode === 'survey' && surveyBuilder}
      {mode === 'engine' && lineItemsEngine}
      {mode === 'classic' && orderEditor}
    </div>
  )
}
