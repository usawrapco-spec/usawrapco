'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Camera, ChevronLeft, ChevronRight, Check, Upload, SkipForward,
  Car, ZoomIn, Ruler, FileText, Image, X, Loader2,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface UploadStep {
  key: string
  title: string
  description: string
  icon: typeof Camera
  accept: string
  optional?: boolean
  hasTextInput?: boolean
  textPlaceholder?: string
}

const UPLOAD_STEPS: UploadStep[] = [
  {
    key: 'front',
    title: 'Front of Vehicle',
    description: 'Stand about 10 feet back and photograph the front straight-on.',
    icon: Car,
    accept: 'image/*',
  },
  {
    key: 'driver_side',
    title: 'Driver Side',
    description: 'Photograph the full driver side from about 10 feet away.',
    icon: Car,
    accept: 'image/*',
  },
  {
    key: 'passenger_side',
    title: 'Passenger Side',
    description: 'Photograph the full passenger side from about 10 feet away.',
    icon: Car,
    accept: 'image/*',
  },
  {
    key: 'rear',
    title: 'Rear of Vehicle',
    description: 'Photograph the rear straight-on from about 10 feet back.',
    icon: Car,
    accept: 'image/*',
  },
  {
    key: 'roof',
    title: 'Roof / Top View',
    description: 'If possible, photograph the roof from above or an elevated angle.',
    icon: Car,
    accept: 'image/*',
    optional: true,
  },
  {
    key: 'closeup',
    title: 'Close-up of Wrap Areas',
    description: 'Show us the specific areas you want wrapped. Take multiple photos if needed.',
    icon: ZoomIn,
    accept: 'image/*',
    optional: true,
  },
  {
    key: 'measurements',
    title: 'Measurements',
    description: 'Use a tape measure and photograph it against the vehicle, or type dimensions below.',
    icon: Ruler,
    accept: 'image/*',
    optional: true,
    hasTextInput: true,
    textPlaceholder: 'e.g. Length: 18ft, Height: 7ft, Box width: 8ft...',
  },
  {
    key: 'logo',
    title: 'Logo Files',
    description: 'Upload your logo or brand files. PNG, AI, EPS, or PDF work best.',
    icon: FileText,
    accept: 'image/*,.pdf,.ai,.eps,.svg',
  },
  {
    key: 'reference',
    title: 'Reference Designs',
    description: 'Show us examples of wraps you like. Screenshots or photos are fine.',
    icon: Image,
    accept: 'image/*,.pdf',
    optional: true,
  },
]

interface UploadedFile {
  stepKey: string
  file: File
  previewUrl: string
  uploadedUrl?: string
  uploading?: boolean
  error?: string
}

interface Props {
  token: string
  orgId: string
  projects: { id: string; title: string; vehicle_desc: string | null; pipe_stage: string }[]
  existingPhotos: Record<string, { category: string; image_url: string }[]>
  preselectedProjectId: string | null
}

export default function PortalUploadCenter({ token, orgId, projects, existingPhotos, preselectedProjectId }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    preselectedProjectId || (projects.length === 1 ? projects[0].id : '')
  )
  const [currentStep, setCurrentStep] = useState(0)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [textInputs, setTextInputs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const step = UPLOAD_STEPS[currentStep]
  const totalSteps = UPLOAD_STEPS.length
  const filesForStep = files.filter(f => f.stepKey === step?.key)
  const isReview = currentStep >= totalSteps

  // Check if a step has uploads from existing photos
  const existingForProject = existingPhotos[selectedProjectId] || []

  const hasFileForStep = useCallback((stepKey: string) => {
    return files.some(f => f.stepKey === stepKey) ||
      existingForProject.some(p => p.category === stepKey)
  }, [files, existingForProject])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected || !step) return

    const newFiles: UploadedFile[] = []
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      newFiles.push({
        stepKey: step.key,
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }
    setFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setFiles(prev => {
      const f = prev[index]
      if (f) URL.revokeObjectURL(f.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function goNext() {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  async function handleSubmitAll() {
    if (!selectedProjectId || files.length === 0) return
    setSubmitting(true)

    try {
      // Upload all files
      for (const f of files) {
        if (f.uploadedUrl) continue
        f.uploading = true
        setFiles([...files])

        const formData = new FormData()
        formData.append('file', f.file)
        formData.append('portal_token', token)
        formData.append('project_id', selectedProjectId)
        formData.append('category', f.stepKey)
        formData.append('description', textInputs[f.stepKey] || '')

        const res = await fetch('/api/portal/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (res.ok && data.url) {
          f.uploadedUrl = data.url
          f.uploading = false
        } else {
          f.error = data.error || 'Upload failed'
          f.uploading = false
        }
        setFiles([...files])
      }

      // Submit any text-only measurements
      if (textInputs.measurements && !files.some(f => f.stepKey === 'measurements')) {
        await fetch('/api/portal/customer-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portal_token: token,
            project_id: selectedProjectId,
            message: `Vehicle measurements: ${textInputs.measurements}`,
          }),
        })
      }

      const hasErrors = files.some(f => f.error)
      if (!hasErrors) {
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Project selector (shown if no project selected) ──
  if (!selectedProjectId && projects.length > 0) {
    return (
      <div style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Upload Photos</h1>
        <p style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>
          Select the project you are uploading photos for.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                color: C.text1,
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</div>
              {p.vehicle_desc && (
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{p.vehicle_desc}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: C.text3 }}>
        <Camera size={36} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text2, marginBottom: 8 }}>
          No Active Projects
        </div>
        <div style={{ fontSize: 13 }}>You will be able to upload photos once a project is created.</div>
      </div>
    )
  }

  // ── Success screen ──
  if (submitted) {
    const uploadCount = files.filter(f => f.uploadedUrl).length
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: `${C.green}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Check size={32} color={C.green} strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All Done!</div>
        <div style={{ fontSize: 14, color: C.text2, marginBottom: 24 }}>
          {uploadCount} file{uploadCount !== 1 ? 's' : ''} uploaded successfully. Our team has been notified.
        </div>
        <button
          onClick={() => {
            setFiles([])
            setTextInputs({})
            setCurrentStep(0)
            setSubmitted(false)
          }}
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            background: C.accent,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Upload More
        </button>
      </div>
    )
  }

  // ── Review screen ──
  if (isReview) {
    const totalFiles = files.length
    const hasText = Object.values(textInputs).some(v => v.trim())
    return (
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Review & Submit</h1>
        <p style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>
          {totalFiles} file{totalFiles !== 1 ? 's' : ''} ready to upload{hasText ? ' + measurements' : ''}.
        </p>

        {/* Thumbnail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: C.surface2 }}>
              {f.file.type.startsWith('image/') ? (
                <img src={f.previewUrl} alt={f.stepKey} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.text3 }}>
                  <FileText size={24} />
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.6)',
                padding: '3px 6px',
                fontSize: 9,
                color: '#fff',
                textTransform: 'capitalize',
              }}>
                {f.stepKey.replace(/_/g, ' ')}
              </div>
              {f.uploading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Loader2 size={20} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
              {f.uploadedUrl && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: C.green,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={10} color="#fff" />
                </div>
              )}
            </div>
          ))}
        </div>

        {hasText && (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 14,
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Measurements
            </div>
            <div style={{ fontSize: 13, color: C.text1 }}>{textInputs.measurements}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setCurrentStep(totalSteps - 1)}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 10,
              background: C.surface2,
              color: C.text1,
              border: `1px solid ${C.border}`,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            Back
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={submitting || totalFiles === 0}
            style={{
              flex: 2,
              padding: '14px',
              borderRadius: 10,
              background: submitting ? C.surface2 : C.green,
              color: '#fff',
              border: 'none',
              cursor: submitting ? 'default' : 'pointer',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Submit All ({totalFiles} file{totalFiles !== 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Step view ──
  const StepIcon = step.icon
  const completedSteps = UPLOAD_STEPS.filter(s => hasFileForStep(s.key)).length
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1 }}>
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span style={{ fontSize: 11, color: C.text3 }}>{progressPct}% complete</span>
        </div>
        <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((currentStep + 1) / totalSteps) * 100}%`,
            background: C.accent,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Step content */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: hasFileForStep(step.key) ? `${C.green}20` : `${C.accent}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          {hasFileForStep(step.key) ? (
            <Check size={24} color={C.green} strokeWidth={2.5} />
          ) : (
            <StepIcon size={24} color={C.accent} strokeWidth={1.8} />
          )}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{step.title}</h2>
        <p style={{ fontSize: 13, color: C.text2, marginBottom: 20, lineHeight: 1.5 }}>
          {step.description}
        </p>

        {/* File preview thumbnails */}
        {filesForStep.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {filesForStep.map((f, i) => {
              const globalIndex = files.indexOf(f)
              return (
                <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: C.surface2 }}>
                  {f.file.type.startsWith('image/') ? (
                    <img src={f.previewUrl} alt={step.key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.text3 }}>
                      <FileText size={20} />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(globalIndex)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Camera / file button */}
        <input
          ref={fileInputRef}
          type="file"
          accept={step.accept}
          capture="environment"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '16px',
            borderRadius: 12,
            background: filesForStep.length > 0 ? C.surface2 : C.accent,
            color: filesForStep.length > 0 ? C.text1 : '#fff',
            border: filesForStep.length > 0 ? `1px solid ${C.border}` : 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          <Camera size={18} />
          {filesForStep.length > 0 ? 'Add More Photos' : 'Take Photo'}
        </button>

        {/* Text input for measurements */}
        {step.hasTextInput && (
          <textarea
            value={textInputs[step.key] || ''}
            onChange={e => setTextInputs(prev => ({ ...prev, [step.key]: e.target.value }))}
            placeholder={step.textPlaceholder}
            rows={3}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: C.surface2,
              border: `1px solid ${C.border}`,
              color: C.text1,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        )}
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
        {UPLOAD_STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setCurrentStep(i)}
            style={{
              width: i === currentStep ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: hasFileForStep(s.key) ? C.green : i === currentStep ? C.accent : C.surface2,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        {currentStep > 0 && (
          <button
            onClick={goBack}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 10,
              background: C.surface2,
              color: C.text1,
              border: `1px solid ${C.border}`,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}
        <button
          onClick={goNext}
          style={{
            flex: currentStep > 0 ? 2 : 1,
            padding: '14px',
            borderRadius: 10,
            background: filesForStep.length > 0 ? C.accent : 'transparent',
            color: filesForStep.length > 0 ? '#fff' : C.text3,
            border: filesForStep.length > 0 ? 'none' : `1px solid ${C.border}`,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {filesForStep.length > 0 ? (
            <>
              Next
              <ChevronRight size={16} />
            </>
          ) : (
            <>
              <SkipForward size={14} />
              {step.optional ? 'Skip' : 'Skip for now'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
