// The typing engine core (spec section 6): slot model, comparison
// normalization, and the input-derived evaluation algorithm.
import { LANGUAGES, type LanguageCode } from '@/lib/languages'

export interface Slot {
  char: string // original character, shown on screen
  typable: boolean // false = the cursor auto-skips it
}

export type SlotResult = 'pending' | 'correct' | 'wrong' | 'skipped'

export interface EvalSettings {
  ignoreDiacritics: boolean
  requireSpaces: boolean
}

// Punctuation or symbol (covers .,!?;:'"-—… and CJK 、。「」！？…).
const PUNCT_SYMBOL_RE = /[\p{P}\p{S}]/u
const COMBINING_RE = /\p{M}/gu

// Multi-character equivalences are out of scope (spec 6.2); these are 1:1 only.
const EXPLICIT_MAP: Record<string, string> = {
  ß: 's',
  ø: 'o',
  đ: 'd',
  ł: 'l',
  ı: 'i',
  æ: 'a', // best-effort single-char fold
  œ: 'o',
}

export function norm(ch: string, settings: EvalSettings): string {
  let c = ch.toLocaleLowerCase()
  if (settings.ignoreDiacritics) {
    c = c.normalize('NFD').replace(COMBINING_RE, '')
    c = EXPLICIT_MAP[c] ?? c
  }
  return c
}

/** A space is non-typable in ja/zh, or when requireSpaces is off. */
function isSpaceTypable(language: LanguageCode, settings: EvalSettings): boolean {
  const usesSpaces = LANGUAGES[language]?.usesSpaces ?? true
  if (!usesSpaces) return false // ja / zh
  return settings.requireSpaces
}

export function buildSlots(
  line: string,
  language: LanguageCode,
  settings: EvalSettings,
): Slot[] {
  const chars = Array.from(line) // handle surrogate pairs correctly
  const spaceTypable = isSpaceTypable(language, settings)

  return chars.map((char) => {
    let typable = true
    if (PUNCT_SYMBOL_RE.test(char)) {
      typable = false
    } else if (char === ' ' || char === '　') {
      typable = spaceTypable
    }
    return { char, typable }
  })
}

export interface EvalOutput {
  results: SlotResult[]
  typedChars: (string | null)[]
  extras: string
  cursorSlot: number
  isComplete: boolean
  isPerfect: boolean
}

/**
 * Derives the full line state from the current input value (spec 6.3). Deriving
 * from the value — never accumulating per-key — makes backspace, paste, select,
 * and IME substitution work for free.
 */
export function evaluate(
  slots: Slot[],
  input: string,
  settings: EvalSettings,
): EvalOutput {
  const inputChars = Array.from(input)
  const results: SlotResult[] = new Array(slots.length).fill('pending')
  const typedChars: (string | null)[] = new Array(slots.length).fill(null)
  let si = 0
  let ci = 0

  while (si < slots.length) {
    const slot = slots[si]

    if (!slot.typable) {
      // Tolerant: if the user typed exactly this punctuation, consume it;
      // otherwise just skip. Both are accepted.
      if (
        ci < inputChars.length &&
        norm(inputChars[ci], settings) === norm(slot.char, settings)
      ) {
        ci++
      }
      results[si] = 'skipped'
      si++
      continue
    }

    if (ci >= inputChars.length) break // cursor hasn't reached here yet

    const typed = inputChars[ci]
    results[si] =
      norm(typed, settings) === norm(slot.char, settings) ? 'correct' : 'wrong'
    typedChars[si] = typed
    si++
    ci++
  }

  const extras = inputChars.slice(ci).join('')
  const cursorSlot = si
  const isComplete = results.every((r) => r !== 'pending')
  const isPerfect =
    isComplete && extras.length === 0 && results.every((r) => r !== 'wrong')

  return { results, typedChars, extras, cursorSlot, isComplete, isPerfect }
}

/** Number of typable slots — the denominator for keystroke accuracy. */
export function typableCount(slots: Slot[]): number {
  return slots.reduce((n, s) => n + (s.typable ? 1 : 0), 0)
}
