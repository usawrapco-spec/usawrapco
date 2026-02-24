// ── Design Proofing & Annotation Types ──────────────────────

export interface DesignProof {
  id: string
  org_id: string
  project_id: string
  version_number: number
  image_url: string
  thumbnail_url: string | null
  designer_notes: string | null
  customer_status: string | null
  customer_feedback: string | null
  customer_approved_at: string | null
  customer_name_confirm: string | null
  responsibility_accepted: boolean
  sent_at: string | null
  sent_by: string | null
  // New columns
  public_token: string
  status: string
  title: string | null
  note_to_customer: string | null
  expires_at: string | null
  decided_at: string | null
  customer_decision: string | null
  customer_overall_note: string | null
  revision_note: string | null
  viewed_at: string | null
  created_at: string
  // Joined fields
  project?: { title: string; vehicle_desc: string | null }
}

export type AnnotationType = 'draw' | 'arrow' | 'text' | 'stamp' | 'rect' | 'circle'
export type AnnotationTool = AnnotationType | 'select'

export interface ProofAnnotation {
  id: string
  proof_id: string
  type: AnnotationType
  color: string
  data: AnnotationData
  page: number
  created_at: string
}

// JSONB data shapes per annotation type
export type AnnotationData =
  | DrawData
  | ArrowData
  | TextData
  | StampData
  | RectData
  | CircleData

export interface DrawData {
  points: { x: number; y: number }[]
  strokeWidth: number
}

export interface ArrowData {
  x1: number; y1: number
  x2: number; y2: number
  strokeWidth: number
}

export interface TextData {
  x: number; y: number
  text: string
  fontSize: number
}

export interface StampData {
  x: number; y: number
  stamp: 'thumbsUp' | 'refresh' | 'help'
}

export interface RectData {
  x: number; y: number
  width: number; height: number
  strokeWidth: number
}

export interface CircleData {
  cx: number; cy: number
  rx: number; ry: number
  strokeWidth: number
}

// Color presets for annotation toolbar
export const ANNOTATION_COLORS = [
  { label: 'Red', value: '#f25a5a' },
  { label: 'Orange', value: '#f59e0b' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Green', value: '#22c07a' },
  { label: 'Blue', value: '#4f7fff' },
  { label: 'White', value: '#ffffff' },
]

export const STAMP_OPTIONS: { key: StampData['stamp']; label: string }[] = [
  { key: 'thumbsUp', label: 'Like' },
  { key: 'refresh', label: 'Redo' },
  { key: 'help', label: 'Question' },
]
