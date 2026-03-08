import type { PhotoAnnotation } from '@/components/projects/PhotoAnnotationEditor'

/**
 * Composites annotations onto a photo using HTML5 Canvas.
 * Returns a PNG Blob with all markers and freehand strokes burned in.
 * Used when generating reports or sending annotated photos to customers.
 */
export function flattenAnnotatedPhoto(
  photoUrl: string,
  annotations: PhotoAnnotation[]
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context unavailable'))

      // Draw base photo
      ctx.drawImage(img, 0, 0)

      // Scale factor for annotations (render at full resolution)
      const w = canvas.width
      const h = canvas.height

      for (const ann of annotations) {
        if (ann.type === 'circle_marker') {
          const cx = (ann.x / 100) * w
          const cy = (ann.y / 100) * h
          const r = Math.max(18, w * 0.012)

          // Circle
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fillStyle = ann.color
          ctx.globalAlpha = 0.85
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(3, w * 0.002)
          ctx.stroke()

          // Label
          if (ann.label) {
            const fontSize = Math.max(20, w * 0.014)
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.8)'
            ctx.shadowBlur = 6
            ctx.shadowOffsetX = 1
            ctx.shadowOffsetY = 1
            ctx.fillText(ann.label, cx + r + 8, cy + fontSize * 0.35)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0
          }
        } else if (ann.type === 'freehand' && ann.data?.points && ann.data.points.length >= 2) {
          const pts = ann.data.points
          ctx.beginPath()
          ctx.strokeStyle = ann.color
          ctx.lineWidth = Math.max(ann.data.strokeWidth || 3, w * 0.003)
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.globalAlpha = 0.9
          ctx.moveTo((pts[0].x / 100) * w, (pts[0].y / 100) * h)
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo((pts[i].x / 100) * w, (pts[i].y / 100) * h)
          }
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        },
        'image/png'
      )
    }
    img.onerror = () => reject(new Error('Failed to load image for annotation flattening'))
    img.src = photoUrl
  })
}
