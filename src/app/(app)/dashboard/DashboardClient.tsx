'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, LibraryBig } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DocumentCard } from '@/components/dashboard/DocumentCard'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/client'
import { progressRatio } from '@/lib/utils'
import { langInfo } from '@/lib/languages'
import type { DocumentSummaryDTO } from '@/lib/serialize'

const SORTS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'played', label: 'Jogado recentemente' },
  { value: 'title', label: 'Título (A-Z)' },
  { value: 'progress-desc', label: 'Maior progresso' },
  { value: 'progress-asc', label: 'Menor progresso' },
]

function docProgress(d: DocumentSummaryDTO): number {
  return progressRatio(d.progress.currentLine, d.lineCount)
}

function DashboardInner({ initialDocs }: { initialDocs: DocumentSummaryDTO[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()
  const lang = params.get('lang') ?? ''
  const sort = params.get('sort') ?? 'recent'

  // Seeded from the server — no fetch-on-mount, no spinner.
  const [docs, setDocs] = useState<DocumentSummaryDTO[]>(initialDocs)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [query])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.replace(`/dashboard?${next.toString()}`, { scroll: false })
  }

  // ---- Optimistic mutations (revert on failure) ----
  function patchLocal(id: string, patch: Partial<DocumentSummaryDTO>) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }
  function withRevert(run: () => Promise<unknown>) {
    const snapshot = docs
    return run().catch((e) => {
      setDocs(snapshot)
      toast({ message: e instanceof Error ? e.message : 'Falha na operação', variant: 'error' })
    })
  }

  function onRename(id: string, title: string) {
    patchLocal(id, { title })
    withRevert(() => api.patch(`/api/documents/${id}`, { title }))
  }
  function onChangeLanguage(id: string, language: string) {
    patchLocal(id, { language })
    withRevert(() => api.patch(`/api/documents/${id}`, { language }))
  }
  function onReset(id: string) {
    patchLocal(id, {
      progress: {
        currentLine: 0,
        totalKeystrokes: 0,
        correctKeystrokes: 0,
        lastPlayedAt: null,
      },
    })
    withRevert(() => api.post(`/api/documents/${id}/reset`))
  }
  function onDelete(id: string) {
    const snapshot = docs
    setDocs((prev) => prev.filter((d) => d.id !== id))
    api.del(`/api/documents/${id}`).catch((e) => {
      setDocs(snapshot)
      toast({ message: e instanceof Error ? e.message : 'Falha ao excluir', variant: 'error' })
    })
  }

  const availableLangs = useMemo(() => {
    return Array.from(new Set(docs.map((d) => d.language)))
  }, [docs])

  const visible = useMemo(() => {
    let list = [...docs]
    if (lang) list = list.filter((d) => d.language === lang)
    if (debounced) list = list.filter((d) => d.title.toLowerCase().includes(debounced))
    const byDate = (a: string) => new Date(a).getTime()
    switch (sort) {
      case 'oldest':
        list.sort((a, b) => byDate(a.createdAt) - byDate(b.createdAt))
        break
      case 'played':
        list.sort(
          (a, b) =>
            byDate(b.progress.lastPlayedAt ?? '1970-01-01') -
            byDate(a.progress.lastPlayedAt ?? '1970-01-01'),
        )
        break
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'progress-desc':
        list.sort((a, b) => docProgress(b) - docProgress(a))
        break
      case 'progress-asc':
        list.sort((a, b) => docProgress(a) - docProgress(b))
        break
      default:
        list.sort((a, b) => byDate(b.createdAt) - byDate(a.createdAt))
    }
    return list
  }, [docs, lang, debounced, sort])

  if (docs.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-24 text-center">
        <LibraryBig className="text-muted" size={40} />
        <h2 className="mt-4 text-lg font-medium">Nenhum documento ainda</h2>
        <p className="mt-1 text-sm text-muted">Comece adicionando uma legenda ou um texto.</p>
        <Link
          href="/upload"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus size={16} /> Adicionar conteúdo
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Meus documentos</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-9 w-44 pl-8"
            />
          </div>
          <Select value={lang} onChange={(e) => setParam('lang', e.target.value)} className="h-9" wrapperClassName="w-44">
            <option value="">Todos os idiomas</option>
            {availableLangs.map((l) => {
              const info = langInfo(l)
              return (
                <option key={l} value={l}>
                  {info?.flag} {info?.name ?? l}
                </option>
              )
            })}
          </Select>
          <Select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="h-9" wrapperClassName="w-48">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          Nenhum documento corresponde aos filtros.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onRename={onRename}
              onChangeLanguage={onChangeLanguage}
              onReset={onReset}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DashboardClient({ initialDocs }: { initialDocs: DocumentSummaryDTO[] }) {
  return (
    <Suspense fallback={<div className="py-24 text-center text-muted">Carregando…</div>}>
      <DashboardInner initialDocs={initialDocs} />
    </Suspense>
  )
}
