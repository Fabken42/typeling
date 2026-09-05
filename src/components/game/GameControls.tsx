'use client'

import { useState } from 'react'
import { Copy, Check, BookmarkPlus } from 'lucide-react'
import { SpeakButton } from '@/components/SpeakButton'
import { cn } from '@/lib/utils'

interface GameControlsProps {
  text: string
  language: string
  onSaveClick: () => void
}

export function GameControls({ text, language, onSaveClick }: GameControlsProps) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <SpeakButton text={text} language={language} />

      <button
        onClick={copy}
        className={cn(
          'inline-flex items-center justify-center rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg',
          copied && 'text-emerald-400',
        )}
        aria-label="Copiar linha"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>

      <button
        onClick={onSaveClick}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <BookmarkPlus size={17} />
        Salvar palavra
      </button>
    </div>
  )
}
