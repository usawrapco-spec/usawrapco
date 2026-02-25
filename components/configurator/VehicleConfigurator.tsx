'use client'
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
// @ts-ignore — types available via @types/three, jsm path differs per bundler
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { VehicleCategory } from '@/lib/configurator/vehicleModels'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WrapMaterial {
  id: string
  name: string
  brand: string
  product_line?: string
  category: string
  hex_color: string
  hex_color_2?: string | null
  roughness: number
  metalness: number
  clearcoat?: number | null
  clearcoat_roughness?: number | null
  env_map_intensity?: number | null
  is_ppf?: boolean | null
  ppf_opacity?: number | null
}

export interface PanelConfig {
  panelId: string
  materialId: string
  material: WrapMaterial
}

export interface ConfiguratorHandle {
  takeScreenshot: () => string | null
  applyMaterialToPanel: (panelId: string | 'all', material: WrapMaterial) => void
  getPanelConfigs: () => PanelConfig[]
  resetPanels: () => void
}

interface VehicleConfiguratorProps {
  vehicleCategory?: VehicleCategory
  onPanelSelect?: (panelId: string | null) => void
  onMaterialApplied?: (configs: PanelConfig[]) => void
  mockupImageUrl?: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildThreeMaterial(mat: WrapMaterial | null, isSelected = false, isHovered = false): THREE.Material {
  if (!mat) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color('#2a2d38'), roughness: 0.4, metalness: 0.1 })
  }

  const color = new THREE.Color(mat.hex_color)

  if (mat.category === 'color_shift') {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.12,
      metalness: 0.6,
      iridescence: 1.0,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [100, 400],
      envMapIntensity: mat.env_map_intensity ?? 2.5,
    } as THREE.MeshPhysicalMaterialParameters & { iridescence?: number; iridescenceIOR?: number; iridescenceThicknessRange?: [number, number] })
    if (isSelected) { m.emissive = new THREE.Color('#4488ff'); m.emissiveIntensity = 0.12 }
    return m
  }

  if (mat.category === 'chrome') {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.02,
      metalness: 1.0,
      envMapIntensity: mat.env_map_intensity ?? 3.0,
    })
    if (isSelected) { m.emissive = new THREE.Color('#4488ff'); m.emissiveIntensity = 0.1 }
    return m
  }

  if (mat.category === 'carbon') {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.38,
      metalness: 0.05,
    })
    if (isSelected) { m.emissive = new THREE.Color('#4488ff'); m.emissiveIntensity = 0.1 }
    return m
  }

  if (mat.is_ppf) {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFFFFF'),
      roughness: mat.roughness,
      metalness: 0.0,
      transparent: true,
      opacity: mat.ppf_opacity ?? 0.08,
      transmission: 0.85,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: mat.roughness * 0.3,
    } as THREE.MeshPhysicalMaterialParameters & { transmission?: number; thickness?: number })
    return m
  }

  // Standard gloss / matte / satin
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: mat.roughness,
    metalness: mat.metalness,
    clearcoat: mat.clearcoat ?? (mat.category === 'gloss' ? 1.0 : mat.category === 'satin' ? 0.6 : 0.0),
    clearcoatRoughness: mat.clearcoat_roughness ?? (mat.category === 'gloss' ? 0.05 : mat.category === 'satin' ? 0.25 : 0.0),
    envMapIntensity: mat.env_map_intensity ?? (mat.category === 'gloss' ? 1.8 : 0.4),
  } as THREE.MeshPhysicalMaterialParameters)

  if (isSelected) { m.emissive = new THREE.Color('#4488ff'); m.emissiveIntensity = 0.12 }
  else if (isHovered) { m.emissive = new THREE.Color('#1a3355'); m.emissiveIntensity = 0.08 }

  return m
}

function disposeMatOn(mesh: THREE.Mesh) {
  if (!mesh.material) return
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  mats.forEach(m => m.dispose())
}

// ── Vehicle geometry builders ─────────────────────────────────────────────────

function buildSprinterVan(defaultMat: () => THREE.Material): { group: THREE.Group; panels: Map<string, THREE.Mesh> } {
  const group = new THREE.Group()
  const panels = new Map<string, THREE.Mesh>()

  const add = (geo: THREE.BufferGeometry, panelId: string, ox=0, oy=0, oz=0) => {
    geo.translate(ox, oy, oz)
    const mesh = new THREE.Mesh(geo, defaultMat())
    mesh.userData.panelId = panelId
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    panels.set(panelId, mesh)
    return mesh
  }

  // Body slab
  add(new THREE.BoxGeometry(5.5, 1.8, 2.1), 'body', 0, 1.3, 0)
  // Roof
  add(new THREE.BoxGeometry(5.6, 0.12, 2.15), 'roof', 0, 2.28, 0)
  // Hood
  add(new THREE.BoxGeometry(1.4, 0.12, 2.1), 'hood', -2.5, 1.42, 0)
  // Front bumper
  add(new THREE.BoxGeometry(0.22, 0.42, 2.1), 'front_bumper', -2.9, 0.68, 0)
  // Rear bumper
  add(new THREE.BoxGeometry(0.22, 0.42, 2.1), 'rear_bumper', 2.9, 0.68, 0)

  // Wheels
  const wMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 })
  const rMat = new THREE.MeshStandardMaterial({ color: '#909090', roughness: 0.12, metalness: 0.9 })
  const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 24)
  const rGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.24, 16)
  ;[[-1.85, 0.38, 1.06], [-1.85, 0.38, -1.06], [1.85, 0.38, 1.06], [1.85, 0.38, -1.06]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2; w.position.set(x,y,z); group.add(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.z = Math.PI/2; r.position.set(x,y,z); group.add(r)
  })

  // Glass
  const gMat = new THREE.MeshPhysicalMaterial({ color: '#1A2A3A', roughness: 0.04, transparent: true, opacity: 0.72, transmission: 0.3 } as any)
  const wsGeo = new THREE.BoxGeometry(0.07, 0.9, 1.7); wsGeo.translate(-2.76, 1.65, 0)
  group.add(new THREE.Mesh(wsGeo, gMat))
  const swGeo = new THREE.BoxGeometry(0.75, 0.5, 0.06)
  ;[[-0.45, 1.85, 1.07], [0.8, 1.85, 1.07], [-0.45, 1.85, -1.07], [0.8, 1.85, -1.07]].forEach(([x,y,z]) => {
    const m = new THREE.Mesh(swGeo, gMat); m.position.set(x,y,z); group.add(m)
  })

  return { group, panels }
}

function buildPickupTruck(defaultMat: () => THREE.Material): { group: THREE.Group; panels: Map<string, THREE.Mesh> } {
  const group = new THREE.Group()
  const panels = new Map<string, THREE.Mesh>()

  const add = (geo: THREE.BufferGeometry, panelId: string, ox=0, oy=0, oz=0) => {
    geo.translate(ox, oy, oz)
    const mesh = new THREE.Mesh(geo, defaultMat())
    mesh.userData.panelId = panelId
    mesh.castShadow = true; mesh.receiveShadow = true
    group.add(mesh); panels.set(panelId, mesh); return mesh
  }

  add(new THREE.BoxGeometry(2.3, 1.5, 1.95), 'cab', -0.85, 1.2, 0)
  add(new THREE.BoxGeometry(1.9, 0.62, 1.95), 'bed', 1.65, 0.8, 0)
  add(new THREE.BoxGeometry(1.45, 0.1, 1.95), 'hood', -2.15, 0.93, 0)
  add(new THREE.BoxGeometry(0.22, 0.42, 1.95), 'front_bumper', -2.95, 0.58, 0)
  add(new THREE.BoxGeometry(0.22, 0.38, 1.95), 'rear_bumper', 2.7, 0.55, 0)

  const wMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 })
  const rMat = new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.1, metalness: 0.9 })
  const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.26, 24)
  const rGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.28, 16)
  ;[[-1.65, 0.4, 0.99], [-1.65, 0.4, -0.99], [1.4, 0.4, 0.99], [1.4, 0.4, -0.99]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2; w.position.set(x,y,z); group.add(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.z = Math.PI/2; r.position.set(x,y,z); group.add(r)
  })

  const gMat = new THREE.MeshPhysicalMaterial({ color: '#1A2A3A', roughness: 0.04, transparent: true, opacity: 0.72, transmission: 0.3 } as any)
  const wsGeo = new THREE.BoxGeometry(0.06, 0.65, 1.8); wsGeo.translate(-1.95, 1.62, 0)
  group.add(new THREE.Mesh(wsGeo, gMat))

  return { group, panels }
}

function buildSedan(defaultMat: () => THREE.Material): { group: THREE.Group; panels: Map<string, THREE.Mesh> } {
  const group = new THREE.Group()
  const panels = new Map<string, THREE.Mesh>()

  const add = (geo: THREE.BufferGeometry, panelId: string, ox=0, oy=0, oz=0) => {
    geo.translate(ox, oy, oz)
    const mesh = new THREE.Mesh(geo, defaultMat())
    mesh.userData.panelId = panelId
    mesh.castShadow = true; mesh.receiveShadow = true
    group.add(mesh); panels.set(panelId, mesh); return mesh
  }

  add(new THREE.BoxGeometry(4.5, 0.9, 1.85), 'body', 0, 0.72, 0)
  add(new THREE.BoxGeometry(2.4, 0.72, 1.78), 'roof', 0, 1.58, 0)
  add(new THREE.BoxGeometry(1.35, 0.1, 1.85), 'hood', -1.7, 1.22, 0)
  add(new THREE.BoxGeometry(0.95, 0.1, 1.85), 'trunk', 1.85, 1.22, 0)
  add(new THREE.BoxGeometry(0.2, 0.38, 1.85), 'front_bumper', -2.4, 0.56, 0)
  add(new THREE.BoxGeometry(0.2, 0.38, 1.85), 'rear_bumper', 2.4, 0.56, 0)

  const wMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.88 })
  const rMat = new THREE.MeshStandardMaterial({ color: '#aaa', roughness: 0.08, metalness: 0.92 })
  const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 24)
  const rGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.22, 16)
  ;[[-1.42, 0.35, 0.95], [-1.42, 0.35, -0.95], [1.42, 0.35, 0.95], [1.42, 0.35, -0.95]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2; w.position.set(x,y,z); group.add(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.z = Math.PI/2; r.position.set(x,y,z); group.add(r)
  })

  const gMat = new THREE.MeshPhysicalMaterial({ color: '#1A2A3A', roughness: 0.04, transparent: true, opacity: 0.74, transmission: 0.3 } as any)
  const wsGeo = new THREE.BoxGeometry(0.06, 0.62, 1.72); wsGeo.translate(-1.12, 1.66, 0)
  group.add(new THREE.Mesh(wsGeo, gMat))
  const rwsGeo = new THREE.BoxGeometry(0.06, 0.55, 1.72); rwsGeo.translate(1.2, 1.62, 0)
  group.add(new THREE.Mesh(rwsGeo, gMat))

  return { group, panels }
}

function buildSUV(defaultMat: () => THREE.Material): { group: THREE.Group; panels: Map<string, THREE.Mesh> } {
  const group = new THREE.Group()
  const panels = new Map<string, THREE.Mesh>()

  const add = (geo: THREE.BufferGeometry, panelId: string, ox=0, oy=0, oz=0) => {
    geo.translate(ox, oy, oz)
    const mesh = new THREE.Mesh(geo, defaultMat())
    mesh.userData.panelId = panelId
    mesh.castShadow = true; mesh.receiveShadow = true
    group.add(mesh); panels.set(panelId, mesh); return mesh
  }

  add(new THREE.BoxGeometry(4.7, 1.2, 1.98), 'body', 0, 0.88, 0)
  add(new THREE.BoxGeometry(2.8, 0.85, 1.92), 'roof', 0, 1.72, 0)
  add(new THREE.BoxGeometry(1.4, 0.1, 1.98), 'hood', -1.75, 1.52, 0)
  add(new THREE.BoxGeometry(0.22, 0.45, 1.98), 'front_bumper', -2.58, 0.72, 0)
  add(new THREE.BoxGeometry(0.22, 0.45, 1.98), 'rear_bumper', 2.58, 0.72, 0)

  const wMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.86 })
  const rMat = new THREE.MeshStandardMaterial({ color: '#999', roughness: 0.1, metalness: 0.9 })
  const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 24)
  const rGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.26, 16)
  ;[[-1.55, 0.4, 1.02], [-1.55, 0.4, -1.02], [1.55, 0.4, 1.02], [1.55, 0.4, -1.02]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2; w.position.set(x,y,z); group.add(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.z = Math.PI/2; r.position.set(x,y,z); group.add(r)
  })

  const gMat = new THREE.MeshPhysicalMaterial({ color: '#1A2A3A', roughness: 0.04, transparent: true, opacity: 0.72, transmission: 0.3 } as any)
  const wsGeo = new THREE.BoxGeometry(0.06, 0.7, 1.85); wsGeo.translate(-1.28, 1.76, 0)
  group.add(new THREE.Mesh(wsGeo, gMat))
  const rwsGeo = new THREE.BoxGeometry(0.06, 0.66, 1.85); rwsGeo.translate(1.32, 1.72, 0)
  group.add(new THREE.Mesh(rwsGeo, gMat))

  return { group, panels }
}

function buildBoxTruck(defaultMat: () => THREE.Material): { group: THREE.Group; panels: Map<string, THREE.Mesh> } {
  const group = new THREE.Group()
  const panels = new Map<string, THREE.Mesh>()

  const add = (geo: THREE.BufferGeometry, panelId: string, ox=0, oy=0, oz=0) => {
    geo.translate(ox, oy, oz)
    const mesh = new THREE.Mesh(geo, defaultMat())
    mesh.userData.panelId = panelId
    mesh.castShadow = true; mesh.receiveShadow = true
    group.add(mesh); panels.set(panelId, mesh); return mesh
  }

  add(new THREE.BoxGeometry(1.85, 1.75, 2.4), 'cab_body', -2.3, 1.28, 0)
  add(new THREE.BoxGeometry(4.8, 2.55, 2.4), 'box_body', 1.15, 1.72, 0)
  add(new THREE.BoxGeometry(4.85, 0.12, 2.45), 'box_roof', 1.15, 3.06, 0)
  add(new THREE.BoxGeometry(0.22, 0.42, 2.4), 'front_bumper', -3.3, 0.62, 0)

  const wMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.85 })
  const rMat = new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.12, metalness: 0.88 })
  const wGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.24, 24)
  const rGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.26, 16)
  ;[[-2.2, 0.44, 1.24], [-2.2, 0.44, -1.24], [1.4, 0.44, 1.38], [1.4, 0.44, 0.92], [1.4, 0.44, -1.38], [1.4, 0.44, -0.92]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2; w.position.set(x,y,z); group.add(w)
    const r = new THREE.Mesh(rGeo, rMat); r.rotation.z = Math.PI/2; r.position.set(x,y,z); group.add(r)
  })

  const gMat = new THREE.MeshPhysicalMaterial({ color: '#1A2A3A', roughness: 0.04, transparent: true, opacity: 0.72, transmission: 0.3 } as any)
  const wsGeo = new THREE.BoxGeometry(0.06, 0.85, 2.1); wsGeo.translate(-3.1, 1.75, 0)
  group.add(new THREE.Mesh(wsGeo, gMat))

  return { group, panels }
}

function buildVehicle(category: VehicleCategory, defaultMat: () => THREE.Material) {
  switch (category) {
    case 'sprinter_van':
    case 'transit_van':
      return buildSprinterVan(defaultMat)
    case 'pickup_truck':
      return buildPickupTruck(defaultMat)
    case 'suv':
      return buildSUV(defaultMat)
    case 'box_truck':
      return buildBoxTruck(defaultMat)
    default:
      return buildSedan(defaultMat)
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const VehicleConfigurator = forwardRef<ConfiguratorHandle, VehicleConfiguratorProps>(
  function VehicleConfigurator({ vehicleCategory = 'sedan', onPanelSelect, onMaterialApplied, mockupImageUrl }, ref) {
    const mountRef    = useRef<HTMLDivElement>(null)
    const sceneRef    = useRef<THREE.Scene | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null)
    const groupRef    = useRef<THREE.Group | null>(null)
    const panelsRef   = useRef<Map<string, THREE.Mesh>>(new Map())
    const frameRef    = useRef<number>(0)
    const dragRef     = useRef(false)
    const lastMouseRef  = useRef({ x: 0, y: 0 })
    const rotRef        = useRef({ x: 0.18, y: 0.5 })
    const configsRef    = useRef<Map<string, PanelConfig>>(new Map())
    const selectedRef   = useRef<string | null>(null)
    const autoRotRef    = useRef(true)

    const [selectedPanel, setSelectedPanel]   = useState<string | null>(null)
    const [hoveredPanel, setHoveredPanel]     = useState<string | null>(null)

    // Refresh emissive on a panel mesh based on selection/hover state
    const refreshPanelEmissive = useCallback((panelId: string, sel: string | null, hov: string | null) => {
      const mesh = panelsRef.current.get(panelId)
      if (!mesh) return
      const m = mesh.material as THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial
      if (!m || !('emissive' in m)) return
      if (panelId === sel) { m.emissive = new THREE.Color('#4488ff'); m.emissiveIntensity = 0.12 }
      else if (panelId === hov) { m.emissive = new THREE.Color('#1a3355'); m.emissiveIntensity = 0.08 }
      else { m.emissive = new THREE.Color('#000000'); m.emissiveIntensity = 0 }
    }, [])

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      takeScreenshot() {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null
        rendererRef.current.render(sceneRef.current, cameraRef.current)
        return rendererRef.current.domElement.toDataURL('image/png')
      },
      applyMaterialToPanel(panelId, material) {
        const toApply = panelId === 'all' ? Array.from(panelsRef.current.keys()) : [panelId]
        toApply.forEach(pid => {
          const mesh = panelsRef.current.get(pid)
          if (!mesh) return
          disposeMatOn(mesh)
          mesh.material = buildThreeMaterial(material, pid === selectedRef.current)
        })
        toApply.forEach(pid => {
          configsRef.current.set(pid, { panelId: pid, materialId: material.id, material })
        })
        onMaterialApplied?.(Array.from(configsRef.current.values()))
      },
      getPanelConfigs() {
        return Array.from(configsRef.current.values())
      },
      resetPanels() {
        panelsRef.current.forEach(mesh => {
          disposeMatOn(mesh)
          mesh.material = buildThreeMaterial(null)
        })
        configsRef.current.clear()
        onMaterialApplied?.([])
      },
    }), [onMaterialApplied])

    // Init Three.js scene
    useEffect(() => {
      if (!mountRef.current) return
      const container = mountRef.current
      const W = container.clientWidth || 800
      const H = container.clientHeight || 500

      // Scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#0D0F14')
      scene.fog = new THREE.FogExp2('#0D0F14', 0.04)
      sceneRef.current = scene

      // Camera
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
      camera.position.set(4.5, 2.4, 4.5)
      camera.lookAt(0, 1.0, 0)
      cameraRef.current = camera

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.25
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Lighting
      scene.add(new THREE.AmbientLight('#ffffff', 0.45))
      const key = new THREE.DirectionalLight('#ffffff', 2.8)
      key.position.set(5, 9, 5); key.castShadow = true
      key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 0.5; key.shadow.camera.far = 30
      scene.add(key)
      const fill = new THREE.DirectionalLight('#6688bb', 0.9)
      fill.position.set(-5, 3, -4); scene.add(fill)
      const rim = new THREE.DirectionalLight('#aaccff', 1.1)
      rim.position.set(0, 6, -7); scene.add(rim)
      scene.add(new THREE.HemisphereLight('#334466', '#1a1a22', 0.65))

      // Environment
      const pmrem = new THREE.PMREMGenerator(renderer)
      const envScene = new RoomEnvironment()
      const envMap = pmrem.fromScene(envScene, 0.04).texture
      scene.environment = envMap
      pmrem.dispose()

      // Ground
      const groundGeo = new THREE.PlaneGeometry(20, 20)
      const groundMat = new THREE.MeshStandardMaterial({ color: '#16181f', roughness: 0.82, metalness: 0.12 })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
      scene.add(new THREE.GridHelper(18, 18, '#222530', '#1e2030'))

      // Vehicle
      const { group, panels } = buildVehicle(vehicleCategory, () => buildThreeMaterial(null))
      scene.add(group)
      groupRef.current = group
      panelsRef.current = panels

      // Ground shadow disc
      const discMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.2 })
      const disc = new THREE.Mesh(new THREE.CircleGeometry(3.8, 32), discMat)
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; group.add(disc)

      // ── Input ──
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()

      const onMouseMove = (e: MouseEvent) => {
        if (dragRef.current) {
          const dx = e.clientX - lastMouseRef.current.x
          const dy = e.clientY - lastMouseRef.current.y
          rotRef.current.y += dx * 0.008
          rotRef.current.x += dy * 0.006
          rotRef.current.x = Math.max(-0.35, Math.min(0.75, rotRef.current.x))
          lastMouseRef.current = { x: e.clientX, y: e.clientY }
          if (groupRef.current) {
            groupRef.current.rotation.y = rotRef.current.y
            groupRef.current.rotation.x = rotRef.current.x
          }
          return
        }
        // Hover
        const rect = renderer.domElement.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(Array.from(panels.values()))
        const hov = hits.length > 0 ? (hits[0].object.userData.panelId as string) : null
        setHoveredPanel(prev => {
          if (prev !== hov) {
            if (prev) refreshPanelEmissive(prev, selectedRef.current, null)
            if (hov) refreshPanelEmissive(hov, selectedRef.current, hov)
          }
          return hov
        })
        renderer.domElement.style.cursor = hov ? 'pointer' : isDraggingNow ? 'grabbing' : 'grab'
      }

      let isDraggingNow = false
      const onMouseDown = (e: MouseEvent) => {
        isDraggingNow = false
        dragRef.current = false
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
        renderer.domElement.style.cursor = 'grabbing'
        autoRotRef.current = false
        const onMove = (ev: MouseEvent) => {
          if (Math.abs(ev.clientX - lastMouseRef.current.x) > 3 || Math.abs(ev.clientY - lastMouseRef.current.y) > 3) {
            isDraggingNow = true; dragRef.current = true
          }
          if (dragRef.current) {
            const dx = ev.clientX - lastMouseRef.current.x
            const dy = ev.clientY - lastMouseRef.current.y
            rotRef.current.y += dx * 0.008
            rotRef.current.x += dy * 0.006
            rotRef.current.x = Math.max(-0.35, Math.min(0.75, rotRef.current.x))
            lastMouseRef.current = { x: ev.clientX, ev: ev.clientY }
            if (groupRef.current) {
              groupRef.current.rotation.y = rotRef.current.y
              groupRef.current.rotation.x = rotRef.current.x
            }
          }
        }
        const onUp = (ev: MouseEvent) => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
          renderer.domElement.style.cursor = 'grab'
          if (!isDraggingNow) {
            // Click → select panel
            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)
            const hits = raycaster.intersectObjects(Array.from(panels.values()))
            const panelId = hits.length > 0 ? (hits[0].object.userData.panelId as string) : null
            const prev = selectedRef.current
            selectedRef.current = panelId
            if (prev) refreshPanelEmissive(prev, panelId, null)
            if (panelId) refreshPanelEmissive(panelId, panelId, null)
            setSelectedPanel(panelId)
            onPanelSelect?.(panelId)
          }
          dragRef.current = false
          isDraggingNow = false
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }

      const onWheel = (e: WheelEvent) => {
        camera.position.multiplyScalar(1 + e.deltaY * 0.001)
        camera.position.clampLength(2.5, 14)
      }

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          autoRotRef.current = false
        }
      }
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1) return
        e.preventDefault()
        const dx = e.touches[0].clientX - lastMouseRef.current.x
        const dy = e.touches[0].clientY - lastMouseRef.current.y
        rotRef.current.y += dx * 0.008
        rotRef.current.x += dy * 0.006
        rotRef.current.x = Math.max(-0.35, Math.min(0.75, rotRef.current.x))
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        if (groupRef.current) {
          groupRef.current.rotation.y = rotRef.current.y
          groupRef.current.rotation.x = rotRef.current.x
        }
      }

      renderer.domElement.addEventListener('mousemove', onMouseMove)
      renderer.domElement.addEventListener('mousedown', onMouseDown)
      renderer.domElement.addEventListener('wheel', onWheel, { passive: true })
      renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true })
      renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
      renderer.domElement.style.cursor = 'grab'

      // Animate
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate)
        if (autoRotRef.current && groupRef.current) {
          groupRef.current.rotation.y += 0.003
          rotRef.current.y = groupRef.current.rotation.y
        }
        renderer.render(scene, camera)
      }
      animate()

      // Resize
      const onResize = () => {
        const W2 = container.clientWidth
        const H2 = container.clientHeight
        camera.aspect = W2 / H2
        camera.updateProjectionMatrix()
        renderer.setSize(W2, H2)
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(container)

      return () => {
        cancelAnimationFrame(frameRef.current)
        ro.disconnect()
        renderer.domElement.removeEventListener('mousemove', onMouseMove)
        renderer.domElement.removeEventListener('mousedown', onMouseDown)
        renderer.domElement.removeEventListener('wheel', onWheel)
        renderer.domElement.removeEventListener('touchstart', onTouchStart)
        renderer.domElement.removeEventListener('touchmove', onTouchMove)
        renderer.dispose()
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      }
    }, [vehicleCategory, onPanelSelect, refreshPanelEmissive])

    // Apply mockup texture when URL changes
    useEffect(() => {
      if (!mockupImageUrl) return
      const loader = new THREE.TextureLoader()
      loader.load(mockupImageUrl, (tex) => {
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        const mockupMat = new THREE.MeshStandardMaterial({
          map: tex, roughness: 0.08, metalness: 0.0,
        })
        const bodyPanels = ['body', 'box_body', 'cab_body', 'cab']
        bodyPanels.forEach(pid => {
          const mesh = panelsRef.current.get(pid)
          if (mesh) { disposeMatOn(mesh); mesh.material = mockupMat }
        })
      })
    }, [mockupImageUrl])

    return (
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
        {/* Panel label overlay */}
        {(selectedPanel || hoveredPanel) && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14,
            background: 'rgba(13,15,20,0.88)', border: '1px solid rgba(79,127,255,0.4)',
            borderRadius: 8, padding: '5px 12px',
            fontSize: 12, color: 'var(--text2)', pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
          }}>
            {selectedPanel
              ? <span style={{ color: 'var(--accent)' }}>Selected: <b style={{ color: 'var(--text1)' }}>{selectedPanel.replace(/_/g, ' ')}</b></span>
              : <span>Hover: {hoveredPanel?.replace(/_/g, ' ')}</span>
            }
          </div>
        )}
        {/* Controls hint */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(13,15,20,0.7)', borderRadius: 8, padding: '4px 10px',
          fontSize: 10, color: 'var(--text3)', pointerEvents: 'none',
          backdropFilter: 'blur(6px)',
        }}>
          Drag to rotate · Scroll to zoom · Click panel to select
        </div>
      </div>
    )
  }
)

export default VehicleConfigurator
