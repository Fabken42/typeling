'use client'

import { createPortal } from 'react-dom'
import { BookmarkPlus } from 'lucide-react'

interface SelectionChipProps {
  text: string
  rect: DOMRect | null
  onClick: () => void
}

export function SelectionChip({ text, rect, onClick }: SelectionChipProps) {
  if (!rect || typeof document === 'undefined') return null

  const top = rect.top - 40
  const left = rect.left + rect.width / 2

  return createPortal(
    <button
      onMouseDown={(e) => {
        // Prevent the mousedown from clearing the selection before we read it.
        e.preventDefault()
      }}
      onClick={onClick}
      style={{ position: 'fixed', top, left, transform: 'translateX(-50%)' }}
      className="z-50 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg hover:bg-emerald-500 animate-fade-in"
    >
      <BookmarkPlus size={15} />
      Salvar “{text.length > 20 ? text.slice(0, 20) + '…' : text}”
    </button>,
    document.body,
  )
}
