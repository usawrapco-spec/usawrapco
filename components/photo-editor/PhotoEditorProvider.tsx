'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ImageSource, PhotoEditorContextValue } from './types'

const PhotoEditorContext = createContext<PhotoEditorContextValue | null>(null)

export function usePhotoEditor() {
  const ctx = useContext(PhotoEditorContext)
  if (!ctx) throw new Error('usePhotoEditor must be used within PhotoEditorProvider')
  return ctx
}

export function PhotoEditorProvider({ children }: { children: React.ReactNode }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isCopyToOpen, setIsCopyToOpen] = useState(false)
  const [currentImage, setCurrentImage] = useState<ImageSource | null>(null)
  const [editorImage, setEditorImage] = useState<ImageSource | null>(null)

  const openEditor = useCallback((image: ImageSource) => {
    setEditorImage(image)
    setIsEditorOpen(true)
  }, [])

  const openCopyTo = useCallback((image: ImageSource) => {
    setCurrentImage(image)
    setIsCopyToOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false)
    setEditorImage(null)
  }, [])

  const closeCopyTo = useCallback(() => {
    setIsCopyToOpen(false)
    setCurrentImage(null)
  }, [])

  return (
    <PhotoEditorContext.Provider
      value={{
        isEditorOpen,
        isCopyToOpen,
        currentImage: isEditorOpen ? editorImage : currentImage,
        openEditor,
        openCopyTo,
        closeEditor,
        closeCopyTo,
      }}
    >
      {children}
      {isEditorOpen && editorImage && <LazyPhotoCanvasEditor />}
      {isCopyToOpen && currentImage && <LazyCopyToModal />}
    </PhotoEditorContext.Provider>
  )
}

// Lazy-load heavy components
import dynamic from 'next/dynamic'

const LazyPhotoCanvasEditor = dynamic(() => import('./PhotoCanvasEditor'), { ssr: false })
const LazyCopyToModal = dynamic(() => import('./CopyToModal'), { ssr: false })
