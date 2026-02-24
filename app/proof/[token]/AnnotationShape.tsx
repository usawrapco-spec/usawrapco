'use client'

import type { ProofAnnotation, DrawData, ArrowData, TextData, StampData, RectData, CircleData } from '@/lib/proof-types'

interface Props {
  annotation: ProofAnnotation
  containerWidth: number
  containerHeight: number
}

// Convert percentage coords to pixel coords
function pct(val: number, dimension: number) {
  return (val / 100) * dimension
}

export default function AnnotationShape({ annotation, containerWidth, containerHeight }: Props) {
  const { type, color, data } = annotation
  const w = containerWidth
  const h = containerHeight

  switch (type) {
    case 'draw': {
      const d = data as DrawData
      if (!d.points || d.points.length < 2) return null
      const pts = d.points.map(p => `${pct(p.x, w)},${pct(p.y, h)}`).join(' ')
      return (
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={d.strokeWidth || 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    case 'arrow': {
      const d = data as ArrowData
      const markerId = `arrow-${annotation.id}`
      return (
        <g>
          <defs>
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          </defs>
          <line
            x1={pct(d.x1, w)}
            y1={pct(d.y1, h)}
            x2={pct(d.x2, w)}
            y2={pct(d.y2, h)}
            stroke={color}
            strokeWidth={d.strokeWidth || 3}
            markerEnd={`url(#${markerId})`}
          />
        </g>
      )
    }

    case 'text': {
      const d = data as TextData
      return (
        <text
          x={pct(d.x, w)}
          y={pct(d.y, h)}
          fill={color}
          fontSize={d.fontSize || 16}
          fontFamily="sans-serif"
          fontWeight="700"
          style={{ userSelect: 'none' }}
        >
          {d.text}
        </text>
      )
    }

    case 'stamp': {
      const d = data as StampData
      const symbols: Record<string, string> = {
        thumbsUp: '\u{1F44D}',
        refresh: '\u{1F504}',
        help: '\u{2753}',
      }
      // Use SVG text with a symbol character
      const labels: Record<string, string> = {
        thumbsUp: '\u2714',
        refresh: '\u21BB',
        help: '?',
      }
      return (
        <g>
          <circle
            cx={pct(d.x, w)}
            cy={pct(d.y, h)}
            r={14}
            fill={color}
            opacity={0.9}
          />
          <text
            x={pct(d.x, w)}
            y={pct(d.y, h)}
            fill={color === '#ffffff' ? '#000' : '#fff'}
            fontSize={14}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ userSelect: 'none' }}
          >
            {labels[d.stamp] || '?'}
          </text>
        </g>
      )
    }

    case 'rect': {
      const d = data as RectData
      return (
        <rect
          x={pct(d.x, w)}
          y={pct(d.y, h)}
          width={pct(d.width, w)}
          height={pct(d.height, h)}
          fill="none"
          stroke={color}
          strokeWidth={d.strokeWidth || 3}
          rx={2}
        />
      )
    }

    case 'circle': {
      const d = data as CircleData
      return (
        <ellipse
          cx={pct(d.cx, w)}
          cy={pct(d.cy, h)}
          rx={pct(d.rx, w)}
          ry={pct(d.ry, h)}
          fill="none"
          stroke={color}
          strokeWidth={d.strokeWidth || 3}
        />
      )
    }

    default:
      return null
  }
}
