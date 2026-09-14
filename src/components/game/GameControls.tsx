'use client'

import { useState } from 'react'
import { Copy, Check, BookmarkPlus, TextSelect } from 'lucide-react'
import { SpeakButton } from '@/components/SpeakButton'
import { cn } from '@/lib/utils'

interface GameControlsProps {
  text: string
  language: string
  onSaveClick: () => void
  // Blurs the game input to close the mobile keyboard, so text can be selected.
  onDismissKeyboard?: () => void
  // Resolves what the copy button should copy: the selected snippet of the
  // current line if any, otherwise the whole line. Falls back to `text`.
  getCopyText?: () => string
}

export function GameControls({
  text,
  language,
  onSaveClick,
  onDismissKeyboard,
  getCopyText,
}: GameControlsProps) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const value = getCopyText ? getCopyText() : text
    navigator.clipboard.writeText(value).then(() => {
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

      {/* Mobile only: dismiss the keyboard so the user can select text (the OS
          blocks selecting page text while the input is focused). */}
      {onDismissKeyboard && (
        <button
          onClick={onDismissKeyboard}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:hidden"
          aria-label="Fechar teclado para selecionar"
        >
          <TextSelect size={17} />
          Selecionar
        </button>
      )}
    </div>
  )
}
