// Cleaning pipeline (spec 5.3). Input is parser blocks (string[][]); output is
// the final flat list of playable lines plus how many raw lines were removed.
import { LANGUAGES, type LanguageCode } from '@/lib/languages'

export interface CleanOptions {
  joinBlockLines: boolean
  removeDialogDashes: boolean
  removeMusicSymbols: boolean
  removeBrackets: boolean
  removeCredits: boolean
  removeConsecutiveDuplicates: boolean
}

export const CLEAN_DEFAULTS: CleanOptions = {
  joinBlockLines: true,
  removeDialogDashes: true,
  removeMusicSymbols: true,
  removeBrackets: true,
  removeCredits: true,
  removeConsecutiveDuplicates: true,
}

const HTML_TAG_RE = /<[^>]+>/g
const BRACKET_SQUARE_RE = /\[[^\]]*\]/g
const BRACKET_CJK_RE = /【[^】]*】/gu
const MUSIC_SYMBOL_RE = /[♪♫♬♩~]/gu
const DIALOG_DASH_RE = /^\s*[-–—]\s*/
const MULTISPACE_RE = /[^\S\n]{2,}/g
const CREDIT_RE =
  /legendado por|legenda:|tradução:|subtitles? by|sync(?:ed)? by|ripped by|www\.|https?:\/\//i
// Any letter or CJK/Hangul script char — a line with none of these is discarded.
const HAS_LETTER_RE =
  /[\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

function collapse(s: string): string {
  return s.replace(MULTISPACE_RE, ' ').trim()
}

export interface CleanResult {
  lines: string[]
  removed: number
  rawCount: number
}

export function cleanBlocks(
  blocks: string[][],
  language: LanguageCode,
  opts: CleanOptions,
): CleanResult {
  const usesSpaces = LANGUAGES[language]?.usesSpaces ?? true
  const separator = usesSpaces ? ' ' : ''

  let rawCount = 0
  const intermediate: string[] = []

  for (const block of blocks) {
    const subLines: string[] = []
    for (const original of block) {
      rawCount++
      let line = original.replace(HTML_TAG_RE, '') // step 1 (always)

      if (opts.removeBrackets) {
        line = line.replace(BRACKET_SQUARE_RE, '').replace(BRACKET_CJK_RE, '') // step 6
      }
      if (opts.removeMusicSymbols) {
        line = line.replace(MUSIC_SYMBOL_RE, '') // step 5 (strip symbols)
      }
      if (opts.removeDialogDashes) {
        line = line.replace(DIALOG_DASH_RE, '') // step 4
      }

      line = collapse(line) // step 2 (always)
      if (line.length > 0) subLines.push(line)
    }

    if (subLines.length === 0) continue

    if (opts.joinBlockLines) {
      intermediate.push(collapse(subLines.join(separator))) // step 3
    } else {
      for (const s of subLines) intermediate.push(s)
    }
  }

  // Sequence-level steps on the flattened lines.
  const out: string[] = []
  let prev: string | null = null
  for (const line of intermediate) {
    if (opts.removeCredits && CREDIT_RE.test(line)) continue // step 7
    if (opts.removeConsecutiveDuplicates && prev !== null && line === prev) {
      continue // step 8
    }
    if (!HAS_LETTER_RE.test(line)) continue // step 9 (always)
    out.push(line)
    prev = line
  }

  return { lines: out, removed: Math.max(0, rawCount - out.length), rawCount }
}
