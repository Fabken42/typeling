// WebVTT parser (spec 5.1). Like SRT but drop the WEBVTT header block, NOTE and
// STYLE blocks, and any cue identifier that precedes the timestamp.
import { normalizeRaw, isTimestampLine } from './srt'

export function parseVtt(raw: string): string[][] {
  let text = normalizeRaw(raw)
  const rawBlocks = text.split(/\n\s*\n/)
  const blocks: string[][] = []

  for (let b = 0; b < rawBlocks.length; b++) {
    const block = rawBlocks[b].trim()
    if (!block) continue

    // Drop the header block (starts with WEBVTT) and NOTE/STYLE/REGION blocks.
    if (block.startsWith('WEBVTT')) continue
    if (/^(NOTE|STYLE|REGION)\b/.test(block)) continue

    const lines = block.split('\n')
    const content: string[] = []
    let seenTimestamp = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (isTimestampLine(line)) {
        seenTimestamp = true
        continue
      }
      // A single line before the timestamp is the optional cue identifier.
      if (!seenTimestamp && i === 0 && lines.length > 1 && isTimestampLine(lines[1])) {
        continue
      }
      if (seenTimestamp) content.push(line)
    }

    if (content.length > 0) blocks.push(content)
  }

  return blocks
}
