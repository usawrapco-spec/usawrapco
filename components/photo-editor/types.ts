export interface ImageSource {
  url: string
  sourceType: 'job_image' | 'media_file' | 'design_proof' | 'chat_attachment'
  sourceId: string
  projectId?: string
  orgId?: string
  fileName: string
  storagePath?: string
  category?: string
}

export interface PhotoEditorContextValue {
  isEditorOpen: boolean
  isCopyToOpen: boolean
  currentImage: ImageSource | null
  openEditor: (image: ImageSource) => void
  openCopyTo: (image: ImageSource) => void
  closeEditor: () => void
  closeCopyTo: () => void
}
