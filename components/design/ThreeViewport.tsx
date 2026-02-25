'use client'

import { useEffect, useRef } from 'react'
import type { CanvasMode, ThreeMeshMeta } from './design-types'
import type { VehicleCategory } from '@/lib/configurator/vehicleModels'
import dynamic from 'next/dynamic'
import type { ConfiguratorHandle, WrapMaterial, PanelConfig } from '@/components/configurator/VehicleConfigurator'
import { Box, Info } from 'lucide-react'

const VehicleConfigurator = dynamic(
  () => import('@/components/configurator/VehicleConfigurator'),
  { ssr: false }
)

interface ThreeViewportProps {
  mode: CanvasMode
  vehicleCategory?: VehicleCategory
  configuratorRef?: React.RefObject<ConfiguratorHandle>
  onPanelSelect?: (pid: string | null) => void
  onMaterialApplied?: (configs: PanelConfig[]) => void
  importedMesh?: any | null
  meshMeta?: ThreeMeshMeta | null
  mockupImageUrl?: string | null
  onImportFile?: () => void
}

function fmtNum(n: number, digits = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export default function ThreeViewport({
  mode,
  vehicleCategory = 'sprinter_van',
  configuratorRef,
  onPanelSelect,
  onMaterialApplied,
  importedMesh,
  meshMeta,
  mockupImageUrl,
  onImportFile,
}: ThreeViewportProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)

  // 3D viewer: bare Three.js scene with OrbitControls + imported mesh
  useEffect(() => {
    if (mode !== '3d-viewer') return
    if (!viewerRef.current) return

    let mounted = true

    const initScene = async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js' as any)

        const container = viewerRef.current!
        const w = container.clientWidth || 800
        const h = container.clientHeight || 600

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(w, h)
        renderer.shadowMap.enabled = true
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.0
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const scene = new THREE.Scene()
        scene.background = new THREE.Color('#0a0c11')

        // Grid
        const grid = new THREE.GridHelper(4, 20, 0x1a1d27, 0x1a1d27)
        scene.add(grid)

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambient)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
        dirLight.position.set(5, 8, 5)
        dirLight.castShadow = true
        scene.add(dirLight)
        const fillLight = new THREE.DirectionalLight(0x4f7fff, 0.3)
        fillLight.position.set(-5, 2, -5)
        scene.add(fillLight)

        const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
        camera.position.set(0, 1.5, 3)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.minDistance = 0.1
        controls.maxDistance = 100

        // Add imported mesh if present
        if (importedMesh) {
          const material = new THREE.MeshStandardMaterial({
            color: 0x4f7fff,
            metalness: 0.3,
            roughness: 0.6,
            side: THREE.DoubleSide,
          })
          const mesh = new THREE.Mesh(importedMesh, material)
          mesh.castShadow = true
          mesh.receiveShadow = true
          scene.add(mesh)

          // Fit camera
          const box = new THREE.Box3().setFromObject(mesh)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          camera.position.set(center.x, center.y + maxDim, center.z + maxDim * 1.5)
          controls.target.copy(center)
          controls.update()
        }

        const handleResize = () => {
          if (!container || !mounted) return
          const nw = container.clientWidth
          const nh = container.clientHeight
          camera.aspect = nw / nh
          camera.updateProjectionMatrix()
          renderer.setSize(nw, nh)
        }
        window.addEventListener('resize', handleResize)

        const animate = () => {
          if (!mounted) return
          animFrameRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        return () => {
          mounted = false
          window.removeEventListener('resize', handleResize)
          cancelAnimationFrame(animFrameRef.current)
          renderer.dispose()
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement)
          }
        }
      } catch (err) {
        console.error('ThreeViewport init error:', err)
      }
    }

    const cleanup = initScene()
    return () => {
      mounted = false
      cleanup.then(fn => fn?.())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, importedMesh])

  if (mode === '3d-configurator') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <VehicleConfigurator
          ref={configuratorRef}
          vehicleCategory={vehicleCategory}
          onPanelSelect={onPanelSelect ?? (() => {})}
          onMaterialApplied={onMaterialApplied ?? (() => {})}
          mockupImageUrl={mockupImageUrl ?? null}
        />
      </div>
    )
  }

  // 3D viewer mode
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />

      {/* Empty state if no mesh */}
      {!importedMesh && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          color: '#5a6080', pointerEvents: 'none',
        }}>
          <Box size={48} style={{ opacity: 0.3 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#9299b5', marginBottom: 6 }}>No 3D file loaded</div>
            <div style={{ fontSize: 13 }}>Go to File → Import 3D File to load a .PLY or .OBJ scan</div>
          </div>
          {onImportFile && (
            <button
              onClick={onImportFile}
              style={{
                pointerEvents: 'all', padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#4f7fff', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Box size={14} />
              Import 3D File
            </button>
          )}
        </div>
      )}

      {/* Mesh metadata overlay */}
      {importedMesh && meshMeta && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(13,15,20,0.9)', border: '1px solid #1a1d27',
          borderRadius: 10, padding: '10px 14px', minWidth: 180,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Info size={12} style={{ color: '#4f7fff' }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mesh Info</span>
          </div>
          {[
            ['Vertices', fmtNum(meshMeta.vertexCount)],
            ['Faces', fmtNum(meshMeta.faceCount)],
            ['Width', `${fmtNum(meshMeta.widthMm, 1)} mm`],
            ['Height', `${fmtNum(meshMeta.heightMm, 1)} mm`],
            ['Depth', `${fmtNum(meshMeta.depthMm, 1)} mm`],
            ['Surface Area', `${fmtNum(meshMeta.surfaceAreaMm2 / 10000, 2)} cm²`],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: '#5a6080' }}>{label}</span>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#e8eaed' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* OrbitControls hint */}
      {importedMesh && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,15,20,0.7)', borderRadius: 20, padding: '4px 12px',
          fontSize: 10, color: '#5a6080', whiteSpace: 'nowrap',
        }}>
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </div>
      )}
    </div>
  )
}
