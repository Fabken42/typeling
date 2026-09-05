// ASS/SSA parser (spec 5.1). Only the [Events] section matters; only Dialogue:
// lines are kept (Comment: ignored). The text is everything after the 9th comma.
import { normalizeRaw } from './srt'

export function parseAss(raw: string): string[][] {
  const text = normalizeRaw(raw)
  const lines = text.split('\n')
  const blocks: string[][] = []
  let inEvents = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('[') && line.endsWith(']')) {
      inEvents = line.toLowerCase() === '[events]'
      continue
    }
    if (!inEvents) continue
    if (!line.startsWith('Dialogue:')) continue

    // Text = everything after the 9th comma of the Dialogue payload.
    let content = line.slice('Dialogue:'.length).split(',').slice(9).join(',')

    content = content
      .replace(/\{[^}]*\}/g, '') // remove override blocks
      .replace(/\\N/g, ' ') // hard line break -> space
      .replace(/\\n/g, ' ') // soft line break -> space
      .replace(/\\h/g, ' ') // hard space -> normal space

    if (content.trim().length > 0) blocks.push([content])
  }

  return blocks
}
