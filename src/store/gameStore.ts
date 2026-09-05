'use client'

import { create } from 'zustand'
import type { DocumentDTO } from '@/lib/serialize'

interface GameState {
  documentId: string | null
  title: string
  language: string
  lines: string[]
  lineCount: number

  currentLine: number
  completedLines: number[]
  totalKeystrokes: number
  correctKeystrokes: number

  input: string
  isComposing: boolean
  compositionStart: number
  pendingSelection: string | null
  revealCount: number // chars revealed via Tab hint
  fullyRevealed: boolean
  finished: boolean

  init: (doc: DocumentDTO, startLine?: number) => void
  setInput: (v: string) => void
  startComposition: (pos: number) => void
  endComposition: (v: string) => void
  setPendingSelection: (s: string | null) => void
  goToLine: (index: number) => void
  completeCurrentLine: (typable: number, correct: number) => void
  revealNext: () => void
  revealAll: () => void
  clearReveal: () => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function progressPayload(s: GameState) {
  return {
    currentLine: s.currentLine,
    completedLines: s.completedLines,
    totalKeystrokes: s.totalKeystrokes,
    correctKeystrokes: s.correctKeystrokes,
  }
}

function scheduleSave(get: () => GameState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = get()
    if (!s.documentId) return
    // Debounced persistence (spec 6.7): 2s after any change.
    fetch(`/api/documents/${s.documentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressPayload(s)),
      keepalive: true,
    }).catch(() => {})
  }, 2000)
}

/** Immediate flush via sendBeacon (visibilitychange handler). */
export function flushProgressBeacon(s: {
  documentId: string | null
  currentLine: number
  completedLines: number[]
  totalKeystrokes: number
  correctKeystrokes: number
}) {
  if (!s.documentId || typeof navigator === 'undefined' || !navigator.sendBeacon)
    return
  const blob = new Blob(
    [
      JSON.stringify({
        currentLine: s.currentLine,
        completedLines: s.completedLines,
        totalKeystrokes: s.totalKeystrokes,
        correctKeystrokes: s.correctKeystrokes,
      }),
    ],
    { type: 'application/json' },
  )
  navigator.sendBeacon(`/api/documents/${s.documentId}/progress`, blob)
}

export const useGameStore = create<GameState>((set, get) => ({
  documentId: null,
  title: '',
  language: 'en',
  lines: [],
  lineCount: 0,
  currentLine: 0,
  completedLines: [],
  totalKeystrokes: 0,
  correctKeystrokes: 0,
  input: '',
  isComposing: false,
  compositionStart: 0,
  pendingSelection: null,
  revealCount: 0,
  fullyRevealed: false,
  finished: false,

  init: (doc, startLine) =>
    set({
      documentId: doc.id,
      title: doc.title,
      language: doc.language,
      lines: doc.lines,
      lineCount: doc.lineCount,
      currentLine:
        startLine != null
          ? Math.max(0, Math.min(startLine, doc.lineCount - 1))
          : Math.max(0, Math.min(doc.progress.currentLine, doc.lineCount - 1)),
      completedLines: [...doc.progress.completedLines],
      totalKeystrokes: doc.progress.totalKeystrokes,
      correctKeystrokes: doc.progress.correctKeystrokes,
      input: '',
      isComposing: false,
      compositionStart: 0,
      pendingSelection: null,
      revealCount: 0,
      fullyRevealed: false,
      finished: false,
    }),

  setInput: (v) => {
    set({ input: v })
  },

  startComposition: (pos) => set({ isComposing: true, compositionStart: pos }),
  endComposition: (v) => set({ isComposing: false, input: v }),

  setPendingSelection: (s) => set({ pendingSelection: s }),

  goToLine: (index) => {
    const { lineCount } = get()
    const clamped = Math.max(0, Math.min(index, lineCount - 1))
    set({
      currentLine: clamped,
      input: '',
      isComposing: false,
      pendingSelection: null,
      revealCount: 0,
      fullyRevealed: false,
      finished: false,
    })
    scheduleSave(get)
  },

  completeCurrentLine: (typable, correct) => {
    const s = get()
    const isLast = s.currentLine >= s.lineCount - 1
    const completed = s.completedLines.includes(s.currentLine)
      ? s.completedLines
      : [...s.completedLines, s.currentLine].sort((a, b) => a - b)

    set({
      completedLines: completed,
      totalKeystrokes: s.totalKeystrokes + typable,
      correctKeystrokes: s.correctKeystrokes + correct,
      input: '',
      isComposing: false,
      pendingSelection: null,
      revealCount: 0,
      fullyRevealed: false,
      currentLine: isLast ? s.currentLine : s.currentLine + 1,
      finished: isLast ? true : false,
    })
    scheduleSave(get)
  },

  revealNext: () =>
    set((s) => ({ revealCount: Math.min(s.revealCount + 1, 9999) })),
  revealAll: () => set({ fullyRevealed: true }),
  clearReveal: () => set({ revealCount: 0, fullyRevealed: false }),
}))
