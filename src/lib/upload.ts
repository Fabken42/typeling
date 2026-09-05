import { unzipSync } from 'fflate'
import { isAcceptedFile } from '@/lib/parsers'

export interface UploadEntry {
  id: string
  name: string // base file name (no path)
  data: Uint8Array // raw bytes, decoded later per selected language/encoding
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

/**
 * Expands selected files into upload entries. A `.zip` is extracted in the
 * browser (fflate) and only its accepted subtitle/text files are kept; any
 * other file is accepted directly (unknown extensions parse as plain text).
 * Returns the entries plus how many files were skipped.
 */
export async function collectEntries(
  files: File[],
): Promise<{ entries: UploadEntry[]; skipped: number }> {
  const entries: UploadEntry[] = []
  let skipped = 0

  for (const file of files) {
    const isZip =
      file.name.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed'

    if (isZip) {
      const buf = new Uint8Array(await file.arrayBuffer())
      let unzipped: Record<string, Uint8Array>
      try {
        unzipped = unzipSync(buf)
      } catch {
        skipped++
        continue
      }
      for (const [path, data] of Object.entries(unzipped)) {
        if (path.endsWith('/') || data.length === 0) continue // directory
        if (!isAcceptedFile(path)) {
          skipped++
          continue
        }
        entries.push({ id: newId(), name: baseName(path), data })
      }
    } else {
      const data = new Uint8Array(await file.arrayBuffer())
      entries.push({ id: newId(), name: file.name, data })
    }
  }

  // Sort by name so episodes land in natural order in the batch list.
  entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )
  return { entries, skipped }
}

export function titleFromName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}
