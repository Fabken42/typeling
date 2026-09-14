'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TypingArea } from '@/components/game/TypingArea'
import { LanguageBadge } from '@/components/LanguageBadge'
import { api } from '@/lib/client'
import { progressRatio } from '@/lib/utils'
import { useGameStore, flushProgressBeacon } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { DocumentDTO } from '@/lib/serialize'
import type { ClientSettings } from '@/lib/settingsDefaults'

interface PlayClientProps {
  doc: DocumentDTO
  startLine?: number
  initialSettings: ClientSettings
}

export function PlayClient({ doc, startLine, initialSettings }: PlayClientProps) {
  const init = useGameStore((s) => s.init)
  const goToLine = useGameStore((s) => s.goToLine)
  const hydrateSettings = useSettingsStore((s) => s.hydrate)

  const title = useGameStore((s) => s.title)
  const language = useGameStore((s) => s.language)
  const currentLine = useGameStore((s) => s.currentLine)
  const lineCount = useGameStore((s) => s.lineCount)
  const finished = useGameStore((s) => s.finished)
  const totalKeystrokes = useGameStore((s) => s.totalKeystrokes)
  const correctKeystrokes = useGameStore((s) => s.correctKeystrokes)
  const storeDocId = useGameStore((s) => s.documentId)

  const [gotoValue, setGotoValue] = useState('')

  // Seed the stores from server data before first paint — no client fetch,
  // no loading spinner.
  useLayoutEffect(() => {
    hydrateSettings(initialSettings)
    init(doc, startLine)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, startLine])

  // Flush progress on tab hide / unmount (spec 6.7).
  useEffect(() => {
    const flush = () => {
      const s = useGameStore.getState()
      if (s.documentId) flushProgressBeacon(s)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  async function restart() {
    try {
      await api.post(`/api/documents/${doc.id}/reset`)
      const full = await api.get<DocumentDTO>(`/api/documents/${doc.id}`)
      init(full, 0)
    } catch {
      goToLine(0)
    }
  }

  // Until the store reflects this document, render the server data so nothing
  // flashes (the layout effect syncs before paint anyway).
  const ready = storeDocId === doc.id
  const dTitle = ready ? title : doc.title
  const dLanguage = ready ? language : doc.language
  const dLineCount = ready ? lineCount : doc.lineCount
  const dCurrentLine = ready ? currentLine : (startLine ?? doc.progress.currentLine)

  const ratio = progressRatio(dCurrentLine, dLineCount)
  const pct = Math.round(ratio * 100)
  const accuracy =
    totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 100

  function jump() {
    const n = parseInt(gotoValue, 10)
    if (Number.isFinite(n)) {
      goToLine(Math.max(0, Math.min(n - 1, dLineCount - 1)))
      setGotoValue('')
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      {/* Document context bar — title + progress (global nav is in the header) */}
      <div className="border-b border-border px-4 py-2.5">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="max-w-[30vw] truncate text-sm font-medium sm:max-w-[45vw]">{dTitle}</span>
          <LanguageBadge language={dLanguage} />
          <ProgressBar value={ratio} className="ml-2 flex-1" />
          <span className="shrink-0 text-xs text-muted">
            linha {Math.min(dCurrentLine + 1, dLineCount)} de {dLineCount} · {pct}%
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        {ready && finished ? (
          <CompletionScreen
            completed={dLineCount}
            lineCount={dLineCount}
            accuracy={accuracy}
            onRestart={restart}
          />
        ) : (
          <TypingArea />
        )}
      </div>

      {/* Navigation */}
      {!(ready && finished) && (
        <footer className="border-t border-border px-4 py-3">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => goToLine(dCurrentLine - 1)} disabled={dCurrentLine <= 0}>
              <ChevronLeft size={16} /> Anterior
            </Button>

            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Input
                value={gotoValue}
                onChange={(e) => setGotoValue(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    jump()
                  }
                }}
                placeholder={String(dCurrentLine + 1)}
                className="h-8 w-16 text-center"
                inputMode="numeric"
              />
              <span>/ {dLineCount}</span>
              <Button variant="secondary" size="sm" onClick={jump}>
                Ir
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToLine(dCurrentLine + 1)}
              disabled={dCurrentLine >= dLineCount - 1}
            >
              Próxima <ChevronRight size={16} />
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}

function CompletionScreen({
  completed,
  lineCount,
  accuracy,
  onRestart,
}: {
  completed: number
  lineCount: number
  accuracy: number
  onRestart: () => void
}) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600/15 text-3xl">
        🎉
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Documento concluído!</h2>
      <p className="mt-2 text-muted">
        {completed}/{lineCount} · acurácia {accuracy}%
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="secondary">
            <LayoutDashboard size={16} /> Voltar ao dashboard
          </Button>
        </Link>
        <Button variant="primary" onClick={onRestart}>
          <RotateCcw size={16} /> Recomeçar do início
        </Button>
      </div>
    </div>
  )
}
