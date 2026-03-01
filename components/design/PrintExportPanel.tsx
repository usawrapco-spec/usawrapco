'use client'

import { useState } from 'react'
import { FileDown, Loader2, CheckCircle, AlertTriangle, Printer } from 'lucide-react'
import { getVehiclePanels, getLinearFeetForPanel } from '@/lib/print/panelDimensions'

interface PrintExportPanelProps {
  jobId: string
  customerName: string
  vehicleDescription: string
  vehicleType: 'car' | 'van' | 'truck' | 'box_truck' | 'trailer' | 'suv'
  selectedZones: string[]
  getCanvasImage: () => string
}

type ExportStep = 'idle' | 'upscaling' | 'generating_pdf' | 'done' | 'error'

const stepLabels: Record<ExportStep, string> = {
  idle: 'Export Print-Ready PDF',
  upscaling: 'Upscaling to 300 DPI...',
  generating_pdf: 'Generating print file...',
  done: 'PDF Ready — Downloading',
  error: 'Export Failed',
}

export default function PrintExportPanel({
  jobId,
  customerName,
  vehicleDescription,
  vehicleType,
  selectedZones,
  getCanvasImage,
}: PrintExportPanelProps) {
  const [step, setStep] = useState<ExportStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [includeProductionBrief, setIncludeProductionBrief] = useState(true)
  const [bleedInches, setBleedInches] = useState(0.5)

  const panels = getVehiclePanels(vehicleType, undefined, undefined, selectedZones)
  const totalLinearFt = panels.reduce((sum, p) => sum + getLinearFeetForPanel(p), 0)

  async function handleExport() {
    if (step !== 'idle' && step !== 'error') return
    setErrorMsg('')

    try {
      const canvasImage = getCanvasImage()
      if (!canvasImage) throw new Error('No design on canvas')

      setStep('upscaling')
      const upscaledPanels: { name: string; imageBase64: string; widthInches: number; heightInches: number; bleedInches: number }[] = []

      for (const panel of panels) {
        const upscaleRes = await fetch('/api/design/upscale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: canvasImage,
            targetWidthInches: panel.widthInches + bleedInches * 2,
            targetHeightInches: panel.heightInches + bleedInches * 2,
            dpi: 300,
          }),
        })

        if (!upscaleRes.ok) throw new Error('Upscaling failed for ' + panel.name)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const json = await upscaleRes.json() as { imageBase64: string }

        upscaledPanels.push({
          name: panel.name,
          imageBase64: json.imageBase64,
          widthInches: panel.widthInches,
          heightInches: panel.heightInches,
          bleedInches,
        })
      }

      setStep('generating_pdf')
      const pdfRes = await fetch('/api/design/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          customerName,
          vehicleDescription,
          panels: upscaledPanels,
          includeProductionBrief,
        }),
      })

      if (!pdfRes.ok) throw new Error('PDF generation failed')

      const blob = await pdfRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wrap-print-${jobId}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setStep('done')
      setTimeout(() => setStep('idle'), 3000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStep('error')
    }
  }

  const isLoading = step === 'upscaling' || step === 'generating_pdf'

  return (
    <div style={{
      background: '#0d1526',
      border: '1px solid #1e2d45',
      borderRadius: 12,
      padding: 20,
      marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Printer size={18} color="#64d2ff" />
        <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>Print-Ready Export</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#8899aa', fontSize: 12, marginBottom: 8 }}>
          {panels.length} panel{panels.length !== 1 ? 's' : ''} · ~{totalLinearFt.toFixed(1)} linear ft
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {panels.map(p => (
            <span key={p.zone} style={{
              background: '#1a2236',
              border: '1px solid #2a3a55',
              borderRadius: 6,
              padding: '3px 8px',
              color: '#c0cce0',
              fontSize: 11,
            }}>
              {p.name} ({p.widthInches}&quot;&times;{p.heightInches}&quot;)
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeProductionBrief}
            onChange={e => setIncludeProductionBrief(e.target.checked)}
            style={{ accentColor: '#64d2ff' }}
          />
          <span style={{ color: '#c0cce0', fontSize: 13 }}>Include production brief (cover page)</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#8899aa', fontSize: 12 }}>Bleed:</span>
          {[0.25, 0.5, 0.75].map(b => (
            <button
              key={b}
              onClick={() => setBleedInches(b)}
              style={{
                background: bleedInches === b ? '#64d2ff' : '#1a2236',
                color: bleedInches === b ? '#000000' : '#8899aa',
                border: '1px solid #2a3a55',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {b}&quot;
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#0a1020',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {[
          '300 DPI at print size',
          'CMYK color profile',
          `${bleedInches}" bleed all sides`,
          'Crop marks included',
          'Panel labels & job ID',
        ].map(s => (
          <span key={s} style={{ color: '#64aa88', fontSize: 11 }}>{s}</span>
        ))}
      </div>

      {step === 'error' && (
        <div style={{
          background: '#2a1a1a',
          border: '1px solid #f25a5a',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={16} color="#f25a5a" />
          <span style={{ color: '#f25a5a', fontSize: 13 }}>{errorMsg || 'Export failed — try again'}</span>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isLoading}
        style={{
          width: '100%',
          background: isLoading ? '#1a2236' : step === 'done' ? '#1a3a2a' : '#64d2ff',
          color: isLoading ? '#505a6b' : step === 'done' ? '#22c07a' : '#000000',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 700,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {isLoading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : step === 'done' ? (
          <CheckCircle size={16} />
        ) : (
          <FileDown size={16} />
        )}
        {stepLabels[step]}
      </button>

      <p style={{ color: '#505a6b', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
        Upscaling via Real-ESRGAN · 30–60 seconds for large panels
      </p>
    </div>
  )
}
