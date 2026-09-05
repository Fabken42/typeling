'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TypingLine } from './TypingLine'
import { TypingInput } from './TypingInput'
import { GameControls } from './GameControls'
import { SelectionChip } from './SelectionChip'
import { SaveTermModal } from './SaveTermModal'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
  buildSlots,
  evaluate,
  typableCount,
  type EvalSettings,
  type SlotResult,
} from '@/lib/text/slots'
import type { LanguageCode } from '@/lib/languages'

export function TypingArea() {
  const settings = useSettingsStore((s) => s.settings)
  const {
    lines,
    language,
    currentLine,
    input,
    isComposing,
    compositionStart,
    pendingSelection,
    revealCount,
    fullyRevealed,
    setInput,
    startComposition,
    endComposition,
    setPendingSelection,
    completeCurrentLine,
    goToLine,
    revealNext,
    revealAll,
  } = useGameStore()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorElRef = useRef<HTMLElement | null>(null)
  // Last text selected inside the line. Unlike pendingSelection state, this is
  // NOT cleared when the selection collapses, so it survives tapping the "save
  // word" button (which collapses the selection on mobile).
  const selectionRef = useRef<string | null>(null)

  const [inputPos, setInputPos] = useState({ top: 0, left: 0 })
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0, height: 0 })
  const [shake, setShake] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTerm, setModalTerm] = useState('')
  const [chipRect, setChipRect] = useState<DOMRect | null>(null)

  const line = lines[currentLine] ?? ''
  const evalSettings: EvalSettings = {
    ignoreDiacritics: settings.ignoreDiacritics,
    requireSpaces: settings.requireSpaces,
  }

  const slots = useMemo(
    () => buildSlots(line, language as LanguageCode, evalSettings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [line, language, settings.ignoreDiacritics, settings.requireSpaces],
  )

  // During composition, evaluate the confirmed prefix normally (spec 6.5).
  const confirmedInput = isComposing ? input.slice(0, compositionStart) : input
  const compositionBuffer = isComposing ? input.slice(compositionStart) : ''

  const evalOut = useMemo(() => {
    const confirmed = evaluate(slots, confirmedInput, evalSettings)
    // Not composing → nothing extra to do.
    if (!isComposing || compositionBuffer.length === 0) return confirmed

    // Real-time feedback for the in-composition (blue) text: evaluate the full
    // input (confirmed + composition) and color the target GREEN where it
    // matches. Mismatches in the composition region stay NEUTRAL (never red) —
    // otherwise the phonetic phase (romaji/kana/pinyin) would flash red before
    // conversion. Committed errors (in the confirmed region) still show red.
    const full = evaluate(slots, input, evalSettings)
    const boundary = confirmed.cursorSlot
    const results: SlotResult[] = full.results.map((r, i) =>
      i >= boundary && r === 'wrong' ? 'pending' : r,
    )
    // Caret sits at the end of the matched (green) run within the composition.
    let cursor = boundary
    while (
      cursor < slots.length &&
      (full.results[cursor] === 'correct' || full.results[cursor] === 'skipped')
    ) {
      cursor++
    }
    return { ...confirmed, results, cursorSlot: cursor, extras: '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slots,
    confirmedInput,
    input,
    isComposing,
    compositionBuffer,
    settings.ignoreDiacritics,
    settings.requireSpaces,
  ])

  const cursorRef = useCallback((el: HTMLElement | null) => {
    cursorElRef.current = el
  }, [])

  // Measure the cursor character's box and align both the caret and the
  // transparent input to it (spec 6.1/6.5). The caret is sized to the font and
  // vertically centered within the line box so it sits over the glyphs, not
  // below them.
  const measure = useCallback(() => {
    const wrap = wrapperRef.current
    const cur = cursorElRef.current
    if (!wrap || !cur) return
    const w = wrap.getBoundingClientRect()
    const c = cur.getBoundingClientRect()
    const fontSize = parseFloat(getComputedStyle(cur).fontSize) || 30
    const caretHeight = fontSize * 1.1
    const top = c.top - w.top
    const left = c.left - w.left
    setInputPos({ top, left })
    setCaretPos({
      top: top + (c.height - caretHeight) / 2,
      left,
      height: caretHeight,
    })
  }, [])

  useLayoutEffect(() => {
    measure()
  }, [measure, currentLine, input, isComposing, compositionStart, slots.length])

  useEffect(() => {
    window.addEventListener('resize', measure)
    // Re-measure once web fonts finish loading (metrics shift otherwise).
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {})
    }
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Keep the input focused unless a selection is active or a modal is open.
  const focusInput = useCallback(() => {
    if (!pendingSelection && !modalOpen) inputRef.current?.focus()
  }, [pendingSelection, modalOpen])

  useEffect(() => {
    selectionRef.current = null
    focusInput()
  }, [currentLine, focusInput])

  // Capture selections via selectionchange too — on mobile, selecting text
  // (long-press) doesn't fire mouseup, so this is the reliable signal. It only
  // ever records a valid in-line selection; it never clears (clearing is
  // explicit elsewhere), so the value survives the button tap that collapses it.
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      const insideLine =
        !!sel?.anchorNode && !!lineRef.current?.contains(sel.anchorNode)
      if (text && insideLine) {
        selectionRef.current = text
        setPendingSelection(text)
        try {
          setChipRect(sel!.getRangeAt(0).getBoundingClientRect())
        } catch {
          setChipRect(null)
        }
      }
    }
    document.addEventListener('selectionchange', onSelChange)
    return () => document.removeEventListener('selectionchange', onSelChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 420)
  }

  const handleAdvance = useCallback(() => {
    if (settings.requireCorrectToAdvance && !evalOut.isPerfect) {
      triggerShake()
      return
    }
    const typable = typableCount(slots)
    const correct = evalOut.results.filter((r) => r === 'correct').length
    completeCurrentLine(typable, correct)
  }, [settings.requireCorrectToAdvance, evalOut, slots, completeCurrentLine])

  // Latest-value ref so the document keydown listener can advance without
  // re-subscribing on every keystroke.
  const advanceRef = useRef(handleAdvance)
  useEffect(() => {
    advanceRef.current = handleAdvance
  }, [handleAdvance])

  function openSaveModal(term?: string) {
    setModalTerm(term ?? selectionRef.current ?? pendingSelection ?? '')
    setModalOpen(true)
  }

  // Input-level keys: Enter (advance) and Tab (hint). IME-safe.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // The classic Enter bug: ignore Enter that confirms an IME candidate.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      handleAdvance()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      revealNext()
    }
  }

  // Document-level shortcuts and selection refocus (spec 6.5 / 7.4).
  useEffect(() => {
    function onDocKey(e: KeyboardEvent) {
      if (modalOpen) return
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault()
        revealAll()
        return
      }
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        openSaveModal()
        return
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        openSaveModal()
        return
      }

      // Plain Enter advances the line even when the game input isn't focused
      // (e.g. the user clicked an empty area). If a form control is focused —
      // the game input itself or the "Ir para linha" box — its own handler
      // deals with Enter, so we skip here to avoid advancing twice.
      if (e.key === 'Enter' && !mod && !e.altKey) {
        if (e.isComposing || e.keyCode === 229) return
        const active = document.activeElement as HTMLElement | null
        const inField =
          !!active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT' ||
            active.isContentEditable)
        if (inField) return
        e.preventDefault()
        advanceRef.current()
        inputRef.current?.focus()
        return
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        goToLine(currentLine - 1)
        return
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goToLine(currentLine + 1)
        return
      }

      // Refocus the input as soon as the user types a printable key while a
      // selection is active — clearing the selection and chip.
      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (pendingSelection) {
          window.getSelection()?.removeAllRanges()
          setPendingSelection(null)
          setChipRect(null)
          selectionRef.current = null
          inputRef.current?.focus()
        } else if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', onDocKey)
    return () => document.removeEventListener('keydown', onDocKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, currentLine, pendingSelection])

  // Capture a mouse selection inside the current line (spec 7.5).
  function onMouseUp() {
    const sel = window.getSelection()
    const text = sel?.toString().trim() ?? ''
    const insideLine = !!sel?.anchorNode && !!lineRef.current?.contains(sel.anchorNode)
    if (text && insideLine) {
      selectionRef.current = text
      setPendingSelection(text)
      try {
        setChipRect(sel!.getRangeAt(0).getBoundingClientRect())
      } catch {
        setChipRect(null)
      }
    } else {
      selectionRef.current = null
      setPendingSelection(null)
      setChipRect(null)
    }
  }

  // Tapping anywhere on the text focuses the hidden input. Focusing inside the
  // tap gesture is what opens the mobile soft keyboard — without this, the
  // keyboard only appeared when tapping right on the tiny input at the cursor.
  // Skipped while text is selected, to preserve the "select a word to save" flow.
  function onAreaClick() {
    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0) return
    // Tapped the text with no selection → forget the last selection and type.
    selectionRef.current = null
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <GameControls
        text={line}
        language={language}
        onSaveClick={() => openSaveModal()}
        onDismissKeyboard={() => inputRef.current?.blur()}
      />

      <div className="flex w-full max-w-3xl flex-col items-center">
        {/* Reserved IME composition band: fixed height so the target line below
            never shifts as the composing (blue) text grows/shrinks. Sits above
            the text, just under the action icons. */}
        <div
          aria-live="polite"
          className="mb-3 flex h-9 items-center justify-center px-8 text-2xl text-sky-400 sm:px-16"
        >
          {compositionBuffer && (
            <span className="underline decoration-dotted underline-offset-4">
              {compositionBuffer}
            </span>
          )}
        </div>

        <div
          ref={wrapperRef}
          className="relative w-full px-8 sm:px-16"
          onMouseUp={onMouseUp}
          onClick={onAreaClick}
        >
          <TypingLine
            slots={slots}
            results={evalOut.results}
            typedChars={evalOut.typedChars}
            extras={evalOut.extras}
            cursorSlot={evalOut.cursorSlot}
            revealCount={revealCount}
            fullyRevealed={fullyRevealed}
            lineRef={lineRef}
            cursorRef={cursorRef}
            shake={shake}
          />
          <span
            aria-hidden
            className="caret animate-caret-blink"
            style={{ top: caretPos.top, left: caretPos.left, height: caretPos.height }}
          />
          <TypingInput
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() =>
              startComposition(inputRef.current?.selectionStart ?? input.length)
            }
            onCompositionUpdate={() => {
              /* re-render only */
            }}
            onCompositionEnd={(e) => endComposition(e.currentTarget.value)}
            style={{ top: inputPos.top, left: inputPos.left }}
          />
        </div>
      </div>

      {pendingSelection && (
        <SelectionChip
          text={pendingSelection}
          rect={chipRect}
          onClick={() => openSaveModal(pendingSelection)}
        />
      )}

      <SaveTermModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setPendingSelection(null)
          setChipRect(null)
          selectionRef.current = null
          window.getSelection()?.removeAllRanges()
          setTimeout(focusInput, 50)
        }}
        initialTerm={modalTerm}
        sentence={line}
        language={language}
        documentId={useGameStore.getState().documentId}
        lineIndex={currentLine}
      />
    </div>
  )
}
