'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, Box, AlertTriangle, Check } from 'lucide-react'
import type { ThreeMeshMeta } from './design-types'
import { createClient } from '@/lib/supabase/client'

interface ThreeFileImporterProps {
  designId: string
  onImport: (geometry: any, meta: ThreeMeshMeta, fileName: string) => void
  onClose: () => void
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

export default function ThreeFileImporter({ designId, onImport, onClose }: ThreeFileImporterProps) {
  const supabase = createClient()
  const dropRef = useRef<HTMLDivElement>(null)

  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    setSuccess(false)

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum is 100 MB.`)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'ply' && ext !== 'obj') {
      setError('Only .PLY and .OBJ files are supported.')
      return
    }

    setLoading(true)
    setProgress(5)
    setProgressLabel('Loading Three.js...')

    try {
      const THREE = await import('three')
      setProgress(20)

      let geometry: any = null

      if (ext === 'ply') {
        setProgressLabel('Parsing PLY file...')
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js' as any)
        const loader = new PLYLoader()
        const buffer = await file.arrayBuffer()
        setProgress(50)
        geometry = loader.parse(buffer)
      } else {
        setProgressLabel('Parsing OBJ file...')
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js' as any)
        const loader = new OBJLoader()
        const text = await file.text()
        setProgress(50)
        const group = loader.parse(text)
        // Extract first geometry from the group
        group.traverse((child: any) => {
          if (!geometry && child.isMesh && child.geometry) {
            geometry = child.geometry.clone()
          }
        })
      }

      if (!geometry) {
        setError('Could not parse geometry from file.')
        setLoading(false)
        return
      }

      setProgress(70)
      setProgressLabel('Computing normals & bounding box...')

      // Normalize geometry
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      const center = new THREE.Vector3()
      box.getCenter(center)
      geometry.translate(-center.x, -center.y, -center.z)

      const size = new THREE.Vector3()
      box.getSize(size)

      // Compute metadata
      const position = geometry.attributes.position
      const vertexCount: number = position ? position.count : 0
      const index = geometry.index
      const faceCount: number = index ? index.count / 3 : vertexCount / 3

      // Surface area estimation
      let surfaceAreaMm2 = 0
      if (position) {
        const vA = new THREE.Vector3()
        const vB = new THREE.Vector3()
        const vC = new THREE.Vector3()
        const crossVec = new THREE.Vector3()
        const indices = index ? index.array : null
        const triCount = index ? index.count / 3 : vertexCount / 3
        for (let i = 0; i < triCount; i++) {
          const a = indices ? indices[i * 3] : i * 3
          const b = indices ? indices[i * 3 + 1] : i * 3 + 1
          const c = indices ? indices[i * 3 + 2] : i * 3 + 2
          vA.fromBufferAttribute(position, a)
          vB.fromBufferAttribute(position, b)
          vC.fromBufferAttribute(position, c)
          crossVec.crossVectors(vB.sub(vA), vC.sub(vA))
          surfaceAreaMm2 += crossVec.length() * 0.5
        }
      }

      const SCALE = 1000 // assume model units are meters → convert to mm
      const meta: ThreeMeshMeta = {
        vertexCount,
        faceCount,
        widthMm: size.x * SCALE,
        heightMm: size.y * SCALE,
        depthMm: size.z * SCALE,
        surfaceAreaMm2: surfaceAreaMm2 * SCALE * SCALE,
      }

      setProgress(85)
      setProgressLabel('Uploading original file...')

      // Upload to Supabase storage (non-blocking if fails)
      try {
        const path = `designs/${designId}/scans/${Date.now()}_${file.name}`
        await supabase.storage.from('project-files').upload(path, file, { upsert: false })
      } catch {
        // ignore upload errors — file is still usable locally
      }

      setProgress(100)
      setProgressLabel('Done!')
      setSuccess(true)

      setTimeout(() => {
        onImport(geometry, meta, file.name)
        onClose()
      }, 600)
    } catch (err: any) {
      console.error('3D file import error:', err)
      setError('Failed to parse file: ' + (err.message || String(err)))
      setLoading(false)
    }
  }, [designId, onImport, onClose, supabase])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#13151c', borderRadius: 16, border: '1px solid #1a1d27', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a1d27' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Box size={18} style={{ color: '#4f7fff' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>Import 3D File</div>
              <div style={{ fontSize: 11, color: '#5a6080' }}>Load a .PLY or .OBJ scan for the 3D Viewer</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? '#4f7fff' : '#2a2f3d'}`,
              borderRadius: 12, padding: '40px 24px', textAlign: 'center',
              background: dragOver ? 'rgba(79,127,255,0.05)' : '#0d0f14',
              transition: 'all 0.15s', marginBottom: 16,
            }}
          >
            {success ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,192,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={24} style={{ color: '#22c07a' }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#22c07a' }}>File imported successfully!</div>
              </div>
            ) : loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, border: '3px solid #1a1d27', borderTopColor: '#4f7fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#9299b5' }}>{progressLabel}</div>
                <div style={{ width: '100%', maxWidth: 280, height: 6, background: '#1a1d27', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #4f7fff, #8b5cf6)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#5a6080' }}>{progress}%</div>
              </div>
            ) : (
              <>
                <Box size={36} style={{ color: '#3a3f55', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#9299b5', marginBottom: 6 }}>
                  Drop a .PLY or .OBJ file here
                </div>
                <div style={{ fontSize: 12, color: '#5a6080', marginBottom: 16 }}>or click to browse</div>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#4f7fff', color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  <Upload size={14} />
                  Choose File
                  <input type="file" accept=".ply,.obj" onChange={handleFileInput} style={{ display: 'none' }} />
                </label>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 8, marginBottom: 12 }}>
              <AlertTriangle size={14} style={{ color: '#f25a5a', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: '#f25a5a' }}>{error}</span>
            </div>
          )}

          {/* Info */}
          <div style={{ fontSize: 11, color: '#5a6080', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: '#9299b5', marginBottom: 4 }}>Supported formats:</div>
            <div>· <strong style={{ color: '#e8eaed' }}>.PLY</strong> — Stanford Polygon Format (from LiDAR scans, photogrammetry)</div>
            <div>· <strong style={{ color: '#e8eaed' }}>.OBJ</strong> — Wavefront OBJ (from Blender, 3ds Max, etc.)</div>
            <div style={{ marginTop: 6 }}>Max file size: <strong style={{ color: '#e8eaed' }}>100 MB</strong></div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
