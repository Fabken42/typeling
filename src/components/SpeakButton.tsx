'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import { langInfo } from '@/lib/languages'
import { useSettingsStore } from '@/store/settingsStore'
import { useSpeech } from '@/lib/speech'

interface SpeakButtonProps {
  text: string
  language: string
  size?: number
  className?: string
}

// Web Speech API button (spec section 10). Shares voice loading / speaking with
// the game's auto-play via the useSpeech hook.
export function SpeakButton({ text, language, size = 18, className }: SpeakButtonProps) {
  const ttsEnabled = useSettingsStore((s) => s.settings.ttsEnabled)
  const { supported, voiceFor, speak: speakText } = useSpeech()
  const [speaking, setSpeaking] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  if (!ttsEnabled || !supported) return null

  const voice = voiceFor(language)
  const langName = langInfo(language)?.name ?? language

  function speak() {
    speakText(text, language, {
      onStart: () => mounted.current && setSpeaking(true),
      onEnd: () => mounted.current && setSpeaking(false),
    })
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
