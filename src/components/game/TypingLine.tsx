'use client'

import { cn } from '@/lib/utils'
import type { Slot, SlotResult } from '@/lib/text/slots'

interface TypingLineProps {
  slots: Slot[]
  results: SlotResult[]
  typedChars: (string | null)[]
  extras: string
  cursorSlot: number
  compositionBuffer: string
  revealCount: number
  fullyRevealed: boolean
  lineRef: React.RefObject<HTMLDivElement | null>
  // Receives the DOM element sitting at the cursor position, so the caret and
  // the transparent input can be measured/aligned against it (see TypingArea).
  cursorRef: (el: HTMLElement | null) => void
  shake: boolean
}

const RESULT_CLASS: Record<SlotResult, string> = {
  pending: 'text-faint',
  correct: 'text-emerald-400',
  wrong: 'text-rose-400 bg-rose-500/15 underline decoration-rose-500 rounded-sm',
  // Auto-skipped punctuation the cursor has already passed shows green, just
  // like the correctly-typed characters around it (not-yet-reached punctuation
  // is still 'pending' and stays faint).
  skipped: 'text-emerald-400',
}

export function TypingLine({
  slots,
  results,
  typedChars,
  extras,
  cursorSlot,
  compositionBuffer,
  revealCount,
  fullyRevealed,
  lineRef,
  cursorRef,
  shake,
}: TypingLineProps) {
  const composing = compositionBuffer.length > 0
  const atEnd = cursorSlot >= slots.length
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < slots.length; i++) {
    // The in-composition buffer sits just before the cursor slot.
    if (i === cursorSlot && composing) {
      nodes.push(
        <span
          key="comp"
          className="text-sky-400 underline decoration-dotted underline-offset-4"
        >
          {compositionBuffer}
        </span>,
      )
    }

    const slot = slots[i]
    const result = results[i]
    const revealed =
      fullyRevealed || (result === 'pending' && i < cursorSlot + revealCount)

    nodes.push(
      <span
        // The cursor character carries the ref so its box can be measured.
        ref={i === cursorSlot ? cursorRef : undefined}
        key={i}
        className={cn(
          RESULT_CLASS[result],
          result === 'pending' && revealed && 'text-zinc-300',
        )}
      >
        {slot.char}
      </span>,
    )
  }

  // Cursor at the very end of the line (all slots consumed).
  if (atEnd) {
    if (composing) {
      nodes.push(
        <span
          key="comp-end"
          className="text-sky-400 underline decoration-dotted underline-offset-4"
        >
          {compositionBuffer}
        </span>,
      )
    }
    if (extras) {
      nodes.push(
        <span key="extras" className="rounded-sm bg-rose-500/25 text-rose-400">
          {extras}
        </span>,
      )
    }
    // Zero-width anchor (ZWSP gives it the line's height) marking the end.
    nodes.push(
      <span ref={cursorRef} key="end" className="inline">
        {'​'}
      </span>,
    )
  }

  return (
    <div
      ref={lineRef}
      className={cn(
        'relative select-text whitespace-pre-wrap text-center text-3xl leading-relaxed sm:text-4xl',
        shake && 'animate-shake',
      )}
      style={{ userSelect: 'text' }}
    >
      {nodes}
    </div>
  )
}
