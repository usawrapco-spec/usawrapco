'use client'
import type * as THREE from 'three'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RotateCcw, Grid3x3, Layers as LayersIcon } from 'lucide-react'

interface ThreeViewportProps {
  fileUrl: string
  fileType: string
  onFlattenComplete: (dataUrl: string) => void
}

export function ThreeViewport({ fileUrl, fileType, onFlattenComplete }: ThreeViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<unknown>(null)
  const [wireframe, setWireframe] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resetViewRef = useRef<(() => void) | null>(null)

  const handleFlatten = useCallback(() => {
    if (!rendererRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (rendererRef.current as any).domElement as HTMLCanvasElement
    const dataUrl = canvas.toDataURL('image/png')
    if (dataUrl) onFlattenComplete(dataUrl)
  }, [onFlattenComplete])

  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current
    let animId = 0
    let ro: ResizeObserver | null = null

    const init = async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js')
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
        const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')

        const w = container.clientWidth || 800
        const h = container.clientHeight || 600

        // Scene setup
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x141414)

        const camera = new THREE.PerspectiveCamera(60, w / h, 0.001, 100000)
        camera.position.set(0, 5, 10)

        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
        renderer.setSize(w, h)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.shadowMap.enabled = true
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.7))
        const dir = new THREE.DirectionalLight(0xffffff, 0.8)
        dir.position.set(10, 20, 10)
        dir.castShadow = true
        scene.add(dir)
        const fill = new THREE.DirectionalLight(0x6688cc, 0.3)
        fill.position.set(-10, 5, -10)
        scene.add(fill)

        // Grid
        const grid = new THREE.GridHelper(200, 40, 0x2a2a2a, 0x1e1e1e)
        scene.add(grid)

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // Reset view helper
        const fitToObject = (obj: THREE.Object3D) => {
          const box = new THREE.Box3().setFromObject(obj)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3()).length()
          camera.position.set(center.x, center.y + size * 0.5, center.z + size * 1.5)
          camera.lookAt(center)
          controls.target.copy(center)
          controls.update()
        }

        resetViewRef.current = () => {
          const meshes = scene.children.filter(c => c.type === 'Mesh' || c.type === 'Group')
          if (meshes[0]) fitToObject(meshes[0])
        }

        // Load model
        const ext = fileType.toLowerCase()
        const mat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, side: THREE.DoubleSide })

        const handleGeometry = (geo: THREE.BufferGeometry) => {
          geo.computeVertexNormals()
          const mesh = new THREE.Mesh(geo, mat)
          scene.add(mesh)
          fitToObject(mesh)
          setLoading(false)
        }

        const handleGroup = (group: THREE.Group) => {
          group.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = mat.clone()
            }
          })
          scene.add(group)
          fitToObject(group)
          setLoading(false)
        }

        if (ext === 'ply') {
          new PLYLoader().load(fileUrl, handleGeometry, undefined, (e) => {
            setError(String(e))
            setLoading(false)
          })
        } else if (ext === 'obj') {
          new OBJLoader().load(fileUrl, handleGroup, undefined, (e) => {
            setError(String(e))
            setLoading(false)
          })
        } else if (ext === 'stl') {
          new STLLoader().load(fileUrl, handleGeometry, undefined, (e) => {
            setError(String(e))
            setLoading(false)
          })
        } else {
          setLoading(false)
        }

        // Wireframe listener
        const applyWireframe = (wf: boolean) => {
          scene.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
              if (m && 'wireframe' in m) m.wireframe = wf
            }
          })
        }
        // Store for external toggle
        ;(renderer as unknown as { _applyWireframe: typeof applyWireframe })._applyWireframe = applyWireframe

        // Animate
        const animate = () => {
          animId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Resize observer
        ro = new ResizeObserver(() => {
          const nw = container.clientWidth
          const nh = container.clientHeight
          if (!nw || !nh) return
          camera.aspect = nw / nh
          camera.updateProjectionMatrix()
          renderer.setSize(nw, nh)
        })
        ro.observe(container)
      } catch (err) {
        setError(String(err))
        setLoading(false)
      }
    }

    init()

    return () => {
      cancelAnimationFrame(animId)
      ro?.disconnect()
      if (rendererRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = rendererRef.current as any
        r.dispose?.()
        r.domElement?.remove()
      }
      rendererRef.current = null
    }
  }, [fileUrl, fileType])

  // Apply wireframe when state changes
  useEffect(() => {
    if (!rendererRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (rendererRef.current as any)._applyWireframe
    if (fn) fn(wireframe)
  }, [wireframe])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#141414' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(20,20,20,0.85)', color: '#2dd4bf', fontSize: 13, fontFamily: 'monospace',
          letterSpacing: 1,
        }}>
          Loading 3D model...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(20,20,20,0.9)', color: '#f25a5a', fontSize: 13, padding: 20, textAlign: 'center',
        }}>
          Failed to load model: {error}
        </div>
      )}

      {/* Viewport controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => setWireframe(w => !w)}
          title="Toggle wireframe"
          style={{
            width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: wireframe ? '#2dd4bf22' : '#1e1e1e',
            color: wireframe ? '#2dd4bf' : '#666',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Grid3x3 size={14} />
        </button>
        <button
          onClick={() => resetViewRef.current?.()}
          title="Reset view"
          style={{
            width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: '#1e1e1e', color: '#666',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={handleFlatten}
          title="Flatten surface to 2D"
          style={{
            padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: '#2dd4bf22', color: '#2dd4bf',
            fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <LayersIcon size={11} /> Flatten
        </button>
      </div>

      {/* Orbit hint */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        color: '#333', fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.5,
        pointerEvents: 'none',
      }}>
        Drag: rotate &nbsp;|&nbsp; Right-drag / two-finger: pan &nbsp;|&nbsp; Scroll: zoom
      </div>
    </div>
  )
}
