export type CanvasMode = '2d' | '3d-configurator' | '3d-viewer'
export type ToolMode = 'select' | 'draw' | 'arrow' | 'rect' | 'circle' | 'text' | 'image' | 'measure' | 'eyedropper'
export type RightPanel = 'layers' | 'coverage' | 'print' | 'files' | 'comments'

export interface LayerDef {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
}

export interface ThreeMeshMeta {
  vertexCount: number
  faceCount: number
  widthMm: number
  heightMm: number
  depthMm: number
  surfaceAreaMm2: number
}
