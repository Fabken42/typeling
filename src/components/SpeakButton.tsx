'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { BCP47, langInfo, type LanguageCode } from '@/lib/languages'
import { useSettingsStore } from '@/store/settingsStore'

interface SpeakButtonProps {
  text: string
  language: string
  size?: number
  className?: string
}

// Web Speech API button (spec section 10). Voices load asynchronously; without
// the voiceschanged listener getVoices() returns [] on the first render.
export function SpeakButton({ text, language, size = 18, className }: SpeakButtonProps) {
  const settings = useSettingsStore((s) => s.settings)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!supported) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [supported])

  if (!settings.ttsEnabled || !supported) return null

  const voice = voices.find((v) =>
    v.lang.toLowerCase().startsWith(language.toLowerCase()),
  )
  const langName = langInfo(language)?.name ?? language

  function speak() {
    if (!voice) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = BCP47[language as LanguageCode] ?? language
    u.rate = settings.ttsRate
    u.onstart = () => mounted.current && setSpeaking(true)
    u.onend = () => mounted.current && setSpeaking(false)
    u.onerror = () => mounted.current && setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const button = (
    <button
      onClick={speak}
      disabled={!voice}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 text-muted transition-colors',
        voice ? 'hover:bg-surface-2 hover:text-fg' : 'cursor-not-allowed opacity-50',
        className,
      )}
      aria-label="Ouvir"
    >
      {speaking ? (
        <Loader2 size={size} className="animate-spin" />
      ) : (
        <Volume2 size={size} />
      )}
    </button>
  )

  if (!voice) {
    return (
      <Tooltip content={`Nenhuma voz de ${langName} instalada neste dispositivo`}>
        {button}
      </Tooltip>
    )
  }
  return button
}
