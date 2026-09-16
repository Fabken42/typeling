'use client'

import { useCallback, useEffect, useState } from 'react'
import { BCP47, type LanguageCode } from '@/lib/languages'
import { useSettingsStore } from '@/store/settingsStore'

interface SpeakOptions {
  onStart?: () => void
  onEnd?: () => void
}

/**
 * Web Speech API access shared by the manual pronunciation button and the
 * game's auto-play (spec section 10). Voices load asynchronously, so the
 * `voiceschanged` listener is required — getVoices() returns [] on first render.
 */
export function useSpeech() {
  const rate = useSettingsStore((s) => s.settings.ttsRate)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    if (!supported) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [supported])

  const voiceFor = useCallback(
    (language: string) =>
      voices.find((v) =>
        v.lang.toLowerCase().startsWith(language.toLowerCase()),
      ),
    [voices],
  )

  // Speaks the text, cancelling anything in progress. Returns false when there
  // is no voice for the language (or TTS is unsupported), so callers can react.
  const speak = useCallback(
    (text: string, language: string, opts?: SpeakOptions): boolean => {
      if (!supported) return false
      const voice = voiceFor(language)
      if (!voice) return false
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = BCP47[language as LanguageCode] ?? language
      u.rate = rate
      if (opts?.onStart) u.onstart = opts.onStart
      const done = () => opts?.onEnd?.()
      u.onend = done
      u.onerror = done
      window.speechSynthesis.speak(u)
      return true
    },
    [supported, voiceFor, rate],
  )

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  return { supported, voices, voiceFor, speak, cancel }
}
