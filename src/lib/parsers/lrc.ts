// LRC parser (spec 5.1). Strip [mm:ss.xx] timestamp prefixes (may repeat on one
// line) and drop metadata tags.
import { normalizeRaw } from './srt'

const META_TAGS = ['ar:', 'ti:', 'al:', 'by:', 'offset:', 're:', 've:']
const TIMESTAMP_RE = /\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g

export function parseLrc(raw: string): string[][] {
  const text = normalizeRaw(raw)
  const lines = text.split('\n')
  const blocks: string[][] = []

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    // Skip metadata tags like [ar:...], [ti:...].
    if (META_TAGS.some((tag) => trimmed.toLowerCase().startsWith('[' + tag))) {
      continue
    }

    const content = trimmed.replace(TIMESTAMP_RE, '').trim()
    if (content.length > 0) blocks.push([content])
  }

  return blocks
}
