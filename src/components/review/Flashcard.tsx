'use client'

import { useMemo } from 'react'
import { SpeakButton } from '@/components/SpeakButton'
import { cn } from '@/lib/utils'
import { previewIntervals, formatInterval } from '@/lib/fsrs'
import type { TermDTO } from '@/lib/serialize'

interface FlashcardProps {
  term: TermDTO
  revealed: boolean
  clozeMode: boolean
  onReveal: () => void
  onRate: (rating: number) => void
}

const RATING_BUTTONS = [
  { rating: 1, label: 'Errei', color: 'bg-rose-600 hover:bg-rose-500' },
  { rating: 2, label: 'Difícil', color: 'bg-amber-600 hover:bg-amber-500' },
  { rating: 3, label: 'Bom', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { rating: 4, label: 'Fácil', color: 'bg-sky-600 hover:bg-sky-500' },
]

/** Renders the sentence, either bolding the term or blanking it (cloze). */
function renderSentence(sentence: string, term: string, cloze: boolean) {
  if (!term) return <>{sentence}</>
  const idx = sentence.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{sentence}</>
  const before = sentence.slice(0, idx)
  const match = sentence.slice(idx, idx + term.length)
  const after = sentence.slice(idx + term.length)
  return (
    <>
      {before}
      {cloze ? (
        <span className="font-semibold text-emerald-400">＿＿＿</span>
      ) : (
        <strong className="font-semibold text-emerald-400">{match}</strong>
      )}
      {after}
    </>
  )
}

export function Flashcard({
  term,
  revealed,
  clozeMode,
  onReveal,
  onRate,
}: FlashcardProps) {
  const intervals = useMemo(() => {
    const now = new Date()
    return previewIntervals(term.fsrs, now).map((p) => formatInterval(p.card, now))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term.id])

  // Cloze = production direction: the front shows the meaning (translation) +
  // the sentence with a blank, and the user must produce the target word. The
  // word (and its audio) is the answer, so it's hidden on the cloze front.
  const isClozeFront = clozeMode && !revealed

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        {/* Term / prompt */}
        <div className="flex flex-col items-center gap-1">
          {isClozeFront ? (
            <>
              <span className="text-xs uppercase tracking-wide text-muted">
                Produza a palavra
              </span>
              <span className="mt-1 text-3xl font-semibold">
                {term.translation || '(sem tradução)'}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-semibold">{term.term}</span>
                <SpeakButton text={term.term} language={term.language} size={22} />
              </div>
              {term.reading && (
                <div className="text-lg text-muted">{term.reading}</div>
              )}
            </>
          )}
        </div>

        {/* Sentence — context. Audio is hidden on the cloze front so the TTS
            doesn't speak the answer word aloud. */}
        {term.sentence && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="rounded-xl border border-border bg-surface-2 px-5 py-3 text-lg">
              {renderSentence(term.sentence, term.term, isClozeFront)}
            </div>
            {!isClozeFront && (
              <SpeakButton text={term.sentence} language={term.language} />
            )}
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
