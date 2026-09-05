// Plain text / textarea parser (spec 5.1). Split by newline; nothing else.
// Each source line is its own single-line block.
import { normalizeRaw } from './srt'

export function parseTxt(raw: string): string[][] {
  const text = normalizeRaw(raw)
  return text.split('\n').map((line) => [line])
}
