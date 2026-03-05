export interface ImageSource {
  url: string
  sourceType: 'job_image' | 'media_file' | 'design_proof' | 'chat_attachment' | 'survey_photo'
  sourceId: string
  projectId?: string
  orgId?: string
  fileName: string
  storagePath?: string
  category?: string
  // Survey photo fields
  estimateId?: string
  surveyPhotoId?: string
}

export interface PhotoEditorContextValue {
  isEditorOpen: boolean
  isCopyToOpen: boolean
  currentImage: ImageSource | null
  openEditor: (image: ImageSource, onSaved?: () => void) => void
  openCopyTo: (image: ImageSource) => void
  closeEditor: () => void
  closeCopyTo: () => void
}
