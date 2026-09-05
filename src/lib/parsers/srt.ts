// SRT parser (spec 5.1). Timestamps are always discarded, never stored.
// Parsers return blocks (string[][]): one entry per subtitle cue, each holding
// that cue's text lines. The cleaning pipeline decides whether to join a cue's
// lines into one (step 3).

export function normalizeRaw(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^﻿/, '')
}

/** True when the line is an SRT/VTT timestamp line (contains -->). */
export function isTimestampLine(line: string): boolean {
  return line.includes('-->')
}

/** True when the line is only a numeric index (SRT cue number). */
export function isIndexLine(line: string): boolean {
  return /^\d+$/.test(line.trim())
}

export function parseSrt(raw: string): string[][] {
  const text = normalizeRaw(raw)
  const rawBlocks = text.split(/\n\s*\n/)
  const blocks: string[][] = []

  for (const block of rawBlocks) {
    const lines = block.split('\n')
    const content: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (i === 0 && isIndexLine(line)) continue
      if (isTimestampLine(line)) continue
      content.push(line)
    }
    if (content.length > 0) blocks.push(content)
  }

  return blocks
}
