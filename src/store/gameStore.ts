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
  totalKeystrokes: number
  correctKeystrokes: number
}) {
  if (!s.documentId || typeof navigator === 'undefined' || !navigator.sendBeacon)
    return
  const blob = new Blob(
    [
      JSON.stringify({
        currentLine: s.currentLine,
        totalKeystrokes: s.totalKeystrokes,
        correctKeystrokes: s.correctKeystrokes,
      }),
    ],
    { type: 'application/json' },
  )
  navigator.sendBeacon(`/api/documents/${s.documentId}/progress`, blob)
}

// --- Local (localStorage) persistence -------------------------------------
//
// The server is checkpointed on a 2s debounce; local storage mirrors the full
// in-progress state (including the current line's typed input and revealed
// hints) on a shorter debounce. When a mobile browser discards the backgrounded
// tab and the user returns, init() restores this snapshot so they land exactly
// where they left off instead of at the last server checkpoint.

const PERSIST_KEY = 'typeling-game'

interface GamePersist {
  documentId: string
  currentLine: number
  totalKeystrokes: number
  correctKeystrokes: number
  input: string
  revealCount: number
  fullyRevealed: boolean
  finished: boolean
}

function loadPersisted(): GamePersist | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY)
    return raw ? (JSON.parse(raw) as GamePersist) : null
  } catch {
    return null
  }
}

function writePersisted(s: GameState) {
  if (typeof window === 'undefined' || !s.documentId) return
  try {
    const snapshot: GamePersist = {
      documentId: s.documentId,
      currentLine: s.currentLine,
      totalKeystrokes: s.totalKeystrokes,
      correctKeystrokes: s.correctKeystrokes,
      input: s.input,
      revealCount: s.revealCount,
      fullyRevealed: s.fullyRevealed,
      finished: s.finished,
    }
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota / privacy mode — persistence is best-effort */
  }
}

let localTimer: ReturnType<typeof setTimeout> | null = null

/** Force an immediate local snapshot (used by the visibilitychange handler). */
export function flushGameLocal() {
  if (localTimer) {
    clearTimeout(localTimer)
    localTimer = null
  }
  writePersisted(useGameStore.getState())
}

export const useGameStore = create<GameState>((set, get) => ({
  documentId: null,
  title: '',
  language: 'en',
  lines: [],
  lineCount: 0,
  currentLine: 0,
  totalKeystrokes: 0,
  correctKeystrokes: 0,
  input: '',
  isComposing: false,
  compositionStart: 0,
  pendingSelection: null,
  revealCount: 0,
  fullyRevealed: false,
  finished: false,

  init: (doc, startLine) => {
    const prev = get()
    const persisted = loadPersisted()
    // Resume from the local snapshot only when returning to the *same* document
    // with no explicit start line, and only if the snapshot is at least as far
    // as the server's checkpoint (i.e. it reflects edits the 2s debounce may not
    // have flushed before the tab was discarded). Otherwise trust the server.
    const resume =
      startLine == null &&
      persisted != null &&
      persisted.documentId === doc.id &&
      persisted.currentLine >= doc.progress.currentLine

    const serverLine =
      startLine != null
        ? Math.max(0, Math.min(startLine, doc.lineCount - 1))
        : Math.max(0, Math.min(doc.progress.currentLine, doc.lineCount - 1))

    set({
      documentId: doc.id,
      title: doc.title,
      language: doc.language,
      lines: doc.lines,
      lineCount: doc.lineCount,
      currentLine: resume
        ? Math.max(0, Math.min(persisted!.currentLine, doc.lineCount - 1))
        : serverLine,
      totalKeystrokes: resume ? persisted!.totalKeystrokes : doc.progress.totalKeystrokes,
      correctKeystrokes: resume
        ? persisted!.correctKeystrokes
        : doc.progress.correctKeystrokes,
      input: resume ? persisted!.input : '',
      isComposing: false,
      compositionStart: 0,
      pendingSelection: null,
      revealCount: resume ? persisted!.revealCount : 0,
      fullyRevealed: resume ? persisted!.fullyRevealed : false,
      finished: resume ? persisted!.finished : false,
    })
  },

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

    set({
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

// Mirror every state change to localStorage on a short debounce. Centralised
// here (instead of in each action) so no mutation can forget to persist.
if (typeof window !== 'undefined') {
  useGameStore.subscribe((s) => {
    if (!s.documentId) return
    if (localTimer) clearTimeout(localTimer)
    localTimer = setTimeout(() => writePersisted(s), 300)
  })
}
