'use client'

import { forwardRef } from 'react'

interface TypingInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onCompositionStart: (e: React.CompositionEvent<HTMLInputElement>) => void
  onCompositionUpdate: (e: React.CompositionEvent<HTMLInputElement>) => void
  onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void
  style: React.CSSProperties
}

/**
 * A real transparent <input> positioned exactly over the cursor slot so the IME
 * candidate window (ja/ko/zh) anchors near the cursor (spec 6.5). It uses
 * opacity:0 — never display:none / off-screen — to keep its real layout box.
 */
export const TypingInput = forwardRef<HTMLInputElement, TypingInputProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onCompositionStart,
      onCompositionUpdate,
      onCompositionEnd,
      style,
    },
    ref,
  ) => {
    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCompositionEnd={onCompositionEnd}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Digite a linha"
        className="absolute z-10 w-[2ch] border-none bg-transparent p-0 text-3xl outline-none sm:text-4xl"
        style={{
          opacity: 0,
          caretColor: 'transparent',
          ...style,
        }}
      />
    )
  },
)
TypingInput.displayName = 'TypingInput'
