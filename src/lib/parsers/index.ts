import { parseSrt } from './srt'
import { parseVtt } from './vtt'
import { parseAss } from './ass'
import { parseLrc } from './lrc'
import { parseTxt } from './txt'

export type ParserFormat = 'srt' | 'vtt' | 'ass' | 'ssa' | 'lrc' | 'txt'

export const ACCEPTED_EXTENSIONS = [
  '.srt',
  '.ass',
  '.ssa',
  '.vtt',
  '.lrc',
  '.txt',
] as const

/** True when the file name has an accepted subtitle/text extension. */
export function isAcceptedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Maps a file name to a parser format, defaulting to txt. */
export function formatFromFileName(fileName: string): ParserFormat {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'srt':
      return 'srt'
    case 'vtt':
      return 'vtt'
    case 'ass':
      return 'ass'
    case 'ssa':
      return 'ssa'
    case 'lrc':
      return 'lrc'
    default:
      return 'txt'
  }
}

/** Parses raw text into blocks (string[][]) according to the format. */
export function parse(raw: string, format: ParserFormat): string[][] {
  switch (format) {
    case 'srt':
      return parseSrt(raw)
    case 'vtt':
      return parseVtt(raw)
    case 'ass':
    case 'ssa':
      return parseAss(raw)
    case 'lrc':
      return parseLrc(raw)
    case 'txt':
    default:
      return parseTxt(raw)
  }
}

export { parseSrt, parseVtt, parseAss, parseLrc, parseTxt }
