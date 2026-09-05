// Encoding detection without a library (spec 5.2). The user picks the language
// before parsing, so the heuristic is: try strict UTF-8, fall back to the
// language's legacy encoding. A manual override wins over both.
import { LEGACY_ENCODING, type LanguageCode } from '@/lib/languages'

export function decodeFile(
  buffer: Uint8Array | ArrayBuffer,
  language: LanguageCode,
  override?: string,
): string {
  if (override) {
    return new TextDecoder(override).decode(buffer)
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    const legacy = LEGACY_ENCODING[language] ?? 'windows-1252'
    return new TextDecoder(legacy).decode(buffer)
  }
}
