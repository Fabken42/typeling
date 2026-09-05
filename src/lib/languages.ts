// Central language table — section 3 of the spec. Closed list.

export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'ru'
  | 'vi'

export interface LanguageInfo {
  code: LanguageCode
  name: string // UI name (pt-BR)
  flag: string
  usesSpaces: boolean
  ime: boolean
  legacyEncoding: string // fallback encoding when not UTF-8
  deeplSource: string // DeepL source_lang code
  bcp47: string // for SpeechSynthesis
}

export const LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  en: { code: 'en', name: 'Inglês', flag: '🇬🇧', usesSpaces: true, ime: false, legacyEncoding: 'windows-1252', deeplSource: 'EN', bcp47: 'en-US' },
  es: { code: 'es', name: 'Espanhol', flag: '🇪🇸', usesSpaces: true, ime: false, legacyEncoding: 'windows-1252', deeplSource: 'ES', bcp47: 'es-ES' },
  fr: { code: 'fr', name: 'Francês', flag: '🇫🇷', usesSpaces: true, ime: false, legacyEncoding: 'windows-1252', deeplSource: 'FR', bcp47: 'fr-FR' },
  de: { code: 'de', name: 'Alemão', flag: '🇩🇪', usesSpaces: true, ime: false, legacyEncoding: 'windows-1252', deeplSource: 'DE', bcp47: 'de-DE' },
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹', usesSpaces: true, ime: false, legacyEncoding: 'windows-1252', deeplSource: 'IT', bcp47: 'it-IT' },
  ja: { code: 'ja', name: 'Japonês', flag: '🇯🇵', usesSpaces: false, ime: true, legacyEncoding: 'shift_jis', deeplSource: 'JA', bcp47: 'ja-JP' },
  ko: { code: 'ko', name: 'Coreano', flag: '🇰🇷', usesSpaces: true, ime: true, legacyEncoding: 'euc-kr', deeplSource: 'KO', bcp47: 'ko-KR' },
  zh: { code: 'zh', name: 'Chinês', flag: '🇨🇳', usesSpaces: false, ime: true, legacyEncoding: 'gb18030', deeplSource: 'ZH', bcp47: 'zh-CN' },
  ru: { code: 'ru', name: 'Russo', flag: '🇷🇺', usesSpaces: true, ime: false, legacyEncoding: 'windows-1251', deeplSource: 'RU', bcp47: 'ru-RU' },
  vi: { code: 'vi', name: 'Vietnamita', flag: '🇻🇳', usesSpaces: true, ime: false, legacyEncoding: 'windows-1258', deeplSource: 'VI', bcp47: 'vi-VN' },
}

export const LANGUAGE_LIST: LanguageInfo[] = Object.values(LANGUAGES)

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[]

export function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === 'string' && v in LANGUAGES
}

export function langInfo(code: string): LanguageInfo | undefined {
  return isLanguageCode(code) ? LANGUAGES[code] : undefined
}

export const LEGACY_ENCODING: Record<LanguageCode, string> = Object.fromEntries(
  LANGUAGE_LIST.map((l) => [l.code, l.legacyEncoding]),
) as Record<LanguageCode, string>

export const BCP47: Record<LanguageCode, string> = Object.fromEntries(
  LANGUAGE_LIST.map((l) => [l.code, l.bcp47]),
) as Record<LanguageCode, string>

// Manual-override encodings offered on the preview screen (section 5.2)
export const MANUAL_ENCODINGS = [
  'utf-8',
  'shift_jis',
  'euc-kr',
  'gb18030',
  'big5',
  'windows-1251',
  'windows-1252',
  'windows-1258',
] as const

// Target languages for translations (section 14)
export const NATIVE_LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)', deepl: 'PT-BR' },
  { code: 'en', name: 'Inglês', deepl: 'EN-US' },
  { code: 'es', name: 'Espanhol', deepl: 'ES' },
] as const

export function nativeToDeepl(code: string): string {
  return NATIVE_LANGUAGES.find((n) => n.code === code)?.deepl ?? 'PT-BR'
}
