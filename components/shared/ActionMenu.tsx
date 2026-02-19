'use client'

import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

export interface ActionItem {
  label: string
  icon: string
  onClick: () => void
  danger?: boolean
  divider?: boolean
}

interface ActionMenuProps {
  items: ActionItem[]
  className?: string
}

export function ActionMenu({ items, className }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className={clsx(
          'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
          'text-text3 hover:text-text1 hover:bg-surface2',
          open && 'bg-surface2 text-text1'
        )}
      >
        <span className="text-sm tracking-widest">⋯</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-52 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden anim-fade-up"
          onClick={e => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && i > 0 && <div className="border-t border-border my-1" />}
              <button
                onClick={() => { item.onClick(); setOpen(false) }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-500 transition-colors',
                  item.danger
                    ? 'text-red hover:bg-red/10'
                    : 'text-text2 hover:bg-surface2 hover:text-text1'
                )}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
