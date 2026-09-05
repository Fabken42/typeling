'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, X, Pencil, PauseCircle, CalendarClock, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Flashcard } from '@/components/review/Flashcard'
import { TermEditModal } from '@/components/TermEditModal'
import { useToast } from '@/components/ui/Toast'
import { useReviewStore, type QueueCounts } from '@/store/reviewStore'
import { useSettingsStore } from '@/store/settingsStore'
import { api } from '@/lib/client'
import { dueLabel } from '@/lib/utils'
import { langInfo } from '@/lib/languages'
import type { TermDTO } from '@/lib/serialize'
import type { ClientSettings } from '@/lib/settingsDefaults'

export interface ReviewInitialData {
  queue: TermDTO[]
  counts: QueueCounts
  nextDue: string | null
}

interface Props {
  initialData: ReviewInitialData
  initialSettings: ClientSettings
}

function ReviewInner({ initialData, initialSettings }: Props) {
  const params = useSearchParams()
  const query = params.toString()
  const { toast } = useToast()

  const settings = useSettingsStore((s) => s.settings)
  const hydrateSettings = useSettingsStore((s) => s.hydrate)
  const updateSettings = useSettingsStore((s) => s.update)

  const {
    queue,
    index,
    revealed,
    counts,
    nextDue,
    loading,
    loaded,
    ratings,
    startedAt,
    load,
    hydrate,
    reveal,
    advance,
    skipCurrent,
    updateCurrent,
  } = useReviewStore()

  const [ended, setEnded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Seed the stores from server data before first paint; refetch only when the
  // filter query actually changes afterwards.
  useLayoutEffect(() => {
    hydrateSettings(initialSettings)
    hydrate(initialData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    setEnded(false)
    load(query)
  }, [query, load])

  const current: TermDTO | undefined = queue[index]
  const reviewedCount = ratings[1] + ratings[2] + ratings[3] + ratings[4]
  const finishedQueue = loaded && !loading && (index >= queue.length || ended)

  const rate = useCallback(
    (rating: number) => {
      const term = queue[index]
      if (!term) return
      advance(rating)
      api.post(`/api/review/${term.id}`, { rating }).catch((e) =>
        toast({
          message: e instanceof Error ? e.message : 'Falha ao agendar revisão',
          variant: 'error',
        }),
      )
    },
    [queue, index, advance, toast],
  )

  const suspend = useCallback(() => {
    const term = queue[index]
    if (!term) return
    skipCurrent()
    api.patch(`/api/terms/${term.id}`, { suspended: true }).catch((e) =>
      toast({
        message: e instanceof Error ? e.message : 'Falha ao suspender',
        variant: 'error',
      }),
    )
  }, [queue, index, skipCurrent, toast])

  // Keyboard shortcuts (spec 13.4).
  useEffect(() => {
    if (finishedQueue) return
    function onKey(e: KeyboardEvent) {
      if (editOpen) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) reveal()
        else rate(3)
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        if (revealed) rate(Number(e.key))
      } else if (e.key === 'e' || e.key === 'E') {
        setEditOpen(true)
      } else if (e.key === 's' || e.key === 'S') {
        suspend()
      } else if (e.key === 'Escape') {
        setEnded(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [finishedQueue, editOpen, revealed, reveal, rate, suspend])

  if (loading || !loaded) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (queue.length === 0 && !ended) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-24 text-center">
        <CalendarClock className="text-muted" size={40} />
        <h2 className="mt-4 text-lg font-medium">Nada para revisar agora</h2>
        <p className="mt-1 text-sm text-muted">
          {nextDue
            ? `Próxima revisão ${dueLabel(nextDue, 2)}.`
            : 'Salve palavras durante o treino para começar a revisar.'}
        </p>
        <Link href="/vocabulary" className="mt-5 text-sm text-emerald-400 hover:underline">
          Ir para o vocabulário
        </Link>
      </div>
    )
  }

  if (finishedQueue) {
    return (
      <SessionSummary
        ratings={ratings}
        total={reviewedCount}
        elapsedMs={Date.now() - startedAt}
        remaining={counts ? Math.max(0, counts.queued - reviewedCount) : 0}
        onContinue={() => {
          setEnded(false)
          load(query)
        }}
      />
    )
  }

  const total = queue.length
  const langName = params.get('lang') ? langInfo(params.get('lang')!)?.name : null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="text-sm text-muted">
          {index + 1} / {total}
          {langName && <span className="ml-2">· {langName}</span>}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Toggle checked={settings.clozeMode} onChange={(v) => updateSettings({ clozeMode: v })} />
          <span className="text-xs text-muted">Cloze</span>
          <button onClick={() => setEditOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg" title="Editar (E)">
            <Pencil size={16} />
          </button>
          <button onClick={suspend} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg" title="Suspender (S)">
            <PauseCircle size={16} />
          </button>
          <button onClick={() => setEnded(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg" title="Encerrar (Esc)">
            <X size={16} />
          </button>
        </div>
      </div>

      {current && (
        <Flashcard
          term={current}
          revealed={revealed}
          clozeMode={settings.clozeMode}
          onReveal={reveal}
          onRate={rate}
        />
      )}

      <TermEditModal
        open={editOpen}
        term={current ?? null}
        onClose={() => setEditOpen(false)}
        onSaved={(t) => updateCurrent(t)}
      />
    </div>
  )
}

function SessionSummary({
  ratings,
  total,
  elapsedMs,
  remaining,
  onContinue,
}: {
  ratings: Record<number, number>
  total: number
  elapsedMs: number
  remaining: number
  onContinue: () => void
}) {
  const minutes = Math.floor(elapsedMs / 60000)
  const seconds = Math.floor((elapsedMs % 60000) / 1000)
  const labels = [
    { r: 1, label: 'Errei', color: 'text-rose-400' },
    { r: 2, label: 'Difícil', color: 'text-amber-400' },
    { r: 3, label: 'Bom', color: 'text-emerald-400' },
    { r: 4, label: 'Fácil', color: 'text-sky-400' },
  ]
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600/15">
        <PartyPopper className="text-emerald-400" size={28} />
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Sessão concluída</h2>
      <p className="mt-2 text-muted">
        {total} card{total !== 1 ? 's' : ''} revisado{total !== 1 ? 's' : ''} em{' '}
        {minutes > 0 ? `${minutes} min ` : ''}
        {seconds}s
      </p>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {labels.map((l) => (
          <div key={l.r} className="rounded-xl border border-border bg-surface p-3">
            <div className={`text-xl font-semibold ${l.color}`}>{ratings[l.r]}</div>
            <div className="text-xs text-muted">{l.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/vocabulary">
          <Button variant="secondary">Voltar ao vocabulário</Button>
        </Link>
        {remaining > 0 && (
          <Button variant="primary" onClick={onContinue}>
            Continuar estudando
          </Button>
        )}
      </div>
    </div>
  )
}

export function ReviewClient(props: Props) {
  return (
    <Suspense fallback={<div className="py-24 text-center text-muted">Carregando…</div>}>
      <ReviewInner {...props} />
    </Suspense>
  )
}
