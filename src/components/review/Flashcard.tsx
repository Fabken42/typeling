'use client'

import { useEffect, useMemo } from 'react'
import { SpeakButton } from '@/components/SpeakButton'
import { LanguageBadge } from '@/components/LanguageBadge'
import { cn } from '@/lib/utils'
import { useSpeech } from '@/lib/speech'
import { useSettingsStore } from '@/store/settingsStore'
import { previewIntervals, formatInterval } from '@/lib/fsrs'
import type { TermDTO } from '@/lib/serialize'

interface FlashcardProps {
  term: TermDTO
  revealed: boolean
  onReveal: () => void
  onRate: (rating: number) => void
}

const RATING_BUTTONS = [
  { rating: 1, label: 'Errei', color: 'bg-rose-600 hover:bg-rose-500' },
  { rating: 2, label: 'Difícil', color: 'bg-amber-600 hover:bg-amber-500' },
  { rating: 3, label: 'Bom', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { rating: 4, label: 'Fácil', color: 'bg-sky-600 hover:bg-sky-500' },
]

/** Renders the sentence with the term bolded. */
function renderSentence(sentence: string, term: string) {
  if (!term) return <>{sentence}</>
  const idx = sentence.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{sentence}</>
  const before = sentence.slice(0, idx)
  const match = sentence.slice(idx, idx + term.length)
  const after = sentence.slice(idx + term.length)
  return (
    <>
      {before}
      <strong className="font-semibold text-emerald-400">{match}</strong>
      {after}
    </>
  )
}

export function Flashcard({ term, revealed, onReveal, onRate }: FlashcardProps) {
  const ttsEnabled = useSettingsStore((s) => s.settings.ttsEnabled)
  const ttsAutoPlay = useSettingsStore((s) => s.settings.ttsAutoPlay)
  const { speak, cancel } = useSpeech()

  const intervals = useMemo(() => {
    const now = new Date()
    return previewIntervals(term.fsrs, now).map((p) => formatInterval(p.card, now))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term.id])

  // Auto-play the card's audio when it appears: the example sentence, or the
  // term itself when there's no sentence. Re-runs once voices finish loading.
  useEffect(() => {
    if (!ttsEnabled || !ttsAutoPlay) return
    const text = term.sentence?.trim() || term.term
    if (text) speak(text, term.language)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term.id, ttsEnabled, ttsAutoPlay, speak])

  // Stop audio when the card is unmounted (session ends).
  useEffect(() => cancel, [cancel])

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        {/* Language of this term — helps avoid confusing which language it is. */}
        <div className="mb-4 flex justify-center">
          <LanguageBadge
            language={term.language}
            showName
            className="rounded-full border border-border bg-surface-2 px-2.5 py-1"
          />
        </div>

        {/* Term / prompt */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <span className="text-5xl font-semibold">{term.term}</span>
            <SpeakButton text={term.term} language={term.language} size={22} />
          </div>
          {term.reading && (
            <div className="text-lg text-muted">{term.reading}</div>
          )}
        </div>

        {/* Sentence — context. */}
        {term.sentence && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="rounded-xl border border-border bg-surface-2 px-5 py-3 text-lg">
              {renderSentence(term.sentence, term.term)}
            </div>
            <SpeakButton text={term.sentence} language={term.language} />
          </div>
        )}

        {/* Answer */}
        {revealed && (
          <div className="mt-6 animate-fade-in">
            <p className="text-2xl font-medium text-emerald-400">
              {term.translation || '(sem tradução)'}
            </p>
            {term.notes && (
              <p className="mx-auto mt-3 max-w-md whitespace-pre-wrap text-sm text-muted">
                {term.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6">
        {!revealed ? (
          <button
            onClick={onReveal}
            className="w-full rounded-xl border border-border bg-surface-2 py-3 text-sm font-medium hover:bg-surface-2/70"
          >
            Mostrar resposta
            <span className="ml-2 text-xs text-faint">Espaço</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATING_BUTTONS.map((b, i) => (
              <button
                key={b.rating}
                onClick={() => onRate(b.rating)}
                className={cn(
                  'flex flex-col items-center rounded-xl py-2.5 text-white transition-colors',
                  b.color,
                )}
              >
                <span className="text-[11px] font-medium opacity-90">
                  {intervals[i]}
                </span>
                <span className="text-sm font-semibold">{b.label}</span>
                <span className="text-[10px] opacity-70">{b.rating}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
