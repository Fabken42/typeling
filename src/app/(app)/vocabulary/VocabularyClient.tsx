'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Pencil,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  Trash2,
  Brain,
  Plus,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TermEditModal } from '@/components/TermEditModal'
import { SaveTermModal } from '@/components/game/SaveTermModal'
import { LanguageBadge } from '@/components/LanguageBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/client'
import { dueLabel, cn } from '@/lib/utils'
import { langInfo } from '@/lib/languages'
import type { TermDTO } from '@/lib/serialize'

const SORTS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'alpha', label: 'Alfabética' },
  { value: 'due', label: 'Próximos da revisão' },
]

const PAGE_SIZE = 50

interface Props {
  initialTerms: TermDTO[]
  initialHasMore: boolean
  initialDueCount: number
  availableLangs: string[]
}

export function VocabularyClient({
  initialTerms,
  initialHasMore,
  initialDueCount,
  availableLangs,
}: Props) {
  const { toast } = useToast()
  const [terms, setTerms] = useState<TermDTO[]>(initialTerms)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [lang, setLang] = useState('')
  const [sort, setSort] = useState('recent')
  const [onlySuspended, setOnlySuspended] = useState(false)
  const [dueCount] = useState(initialDueCount)

  const [editing, setEditing] = useState<TermDTO | null>(null)
  const [deleting, setDeleting] = useState<TermDTO | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Tracks how many rows we've pulled from the server, independent of local
  // optimistic add/remove, so skip stays aligned with the server offset.
  const loadedRef = useRef(initialTerms.length)

  function buildQuery(skip: number) {
    const p = new URLSearchParams()
    if (lang) p.set('lang', lang)
    p.set('sort', sort)
    if (onlySuspended) p.set('suspended', 'true')
    if (debounced) p.set('q', debounced)
    p.set('limit', String(PAGE_SIZE))
    p.set('skip', String(skip))
    return p.toString()
  }

  async function refetch() {
    try {
      const batch = await api.get<TermDTO[]>(`/api/terms?${buildQuery(0)}`)
      setTerms(batch)
      loadedRef.current = batch.length
      setHasMore(batch.length === PAGE_SIZE)
    } catch {
      /* keep current list */
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const batch = await api.get<TermDTO[]>(`/api/terms?${buildQuery(loadedRef.current)}`)
      setTerms((prev) => [...prev, ...batch])
      loadedRef.current += batch.length
      setHasMore(batch.length === PAGE_SIZE)
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false)
    }
  }

  // Refetch page 0 whenever a filter or the (debounced) search changes. The
  // first run is skipped — the initial page is server-rendered.
  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, sort, onlySuspended, debounced])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [query])

  function toggleSuspend(t: TermDTO) {
    const prev = terms
    const newVal = !t.suspended
    setTerms(() => {
      const next = prev.map((x) => (x.id === t.id ? { ...x, suspended: newVal } : x))
      return onlySuspended && !newVal ? next.filter((x) => x.id !== t.id) : next
    })
    api.patch(`/api/terms/${t.id}`, { suspended: newVal }).catch((e) => {
      setTerms(prev)
      toast({ message: e instanceof Error ? e.message : 'Falha ao atualizar', variant: 'error' })
    })
  }

  function remove() {
    if (!deleting) return
    const target = deleting
    const prev = terms
    setTerms(prev.filter((x) => x.id !== target.id))
    setDeleting(null)
    api.del(`/api/terms/${target.id}`).catch((e) => {
      setTerms(prev)
      toast({ message: e instanceof Error ? e.message : 'Falha ao excluir', variant: 'error' })
    })
  }

  function upsertLocal(updated: TermDTO) {
    setTerms((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }

  function prependLocal(created: TermDTO) {
    if (lang && created.language !== lang) return
    if (onlySuspended && !created.suspended) return
    setTerms((prev) => [created, ...prev])
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Vocabulário</h1>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Adicionar palavra
          </Button>
          <Link href="/review">
            <Button variant="primary">
              <Brain size={16} /> Revisar agora
              {dueCount > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{dueCount}</span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar termo ou tradução…"
            className="h-9 w-64 pl-8"
          />
        </div>
        <Select value={lang} onChange={(e) => setLang(e.target.value)} className="h-9" wrapperClassName="w-44">
          <option value="">Todos os idiomas</option>
          {availableLangs.map((l) => (
            <option key={l} value={l}>
              {langInfo(l)?.flag} {langInfo(l)?.name ?? l}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9" wrapperClassName="w-48">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 pl-1 text-sm text-muted">
          <Toggle checked={onlySuspended} onChange={setOnlySuspended} />
          Apenas suspensos
        </label>
      </div>

      {/* Table */}
      {terms.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">Nenhum termo encontrado.</p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Termo</th>
                  <th className="px-4 py-2.5 font-medium">Tradução</th>
                  <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Frase</th>
                  <th className="px-4 py-2.5 font-medium">Idioma</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Revisão</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {terms.map((t) => (
                  <tr key={t.id} className={cn('hover:bg-surface/60', t.suspended && 'opacity-50')}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{t.term}</div>
                      {t.reading && <div className="text-xs text-muted">{t.reading}</div>}
                    </td>
                    <td className="px-4 py-2.5">{t.translation || <span className="text-faint">—</span>}</td>
                    <td className="hidden max-w-xs px-4 py-2.5 lg:table-cell">
                      <Tooltip content={t.sentence}>
                        <span className="block truncate text-muted">{t.sentence}</span>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-2.5"><LanguageBadge language={t.language} /></td>
                    <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{dueLabel(t.fsrs.due, t.fsrs.state)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Editar" onClick={() => setEditing(t)}><Pencil size={15} /></IconBtn>
                        <IconBtn
                          title={t.suspended ? 'Reativar' : 'Suspender'}
                          onClick={() => toggleSuspend(t)}
                        >
                          {t.suspended ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                        </IconBtn>
                        {t.documentId && (
                          <Link
                            href={`/play/${t.documentId}${t.lineIndex != null ? `?line=${t.lineIndex}` : ''}`}
                            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                            title="Ir para o contexto"
                          >
                            <ExternalLink size={15} />
                          </Link>
                        )}
                        <IconBtn title="Excluir" danger onClick={() => setDeleting(t)}>
                          <Trash2 size={15} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}

      <TermEditModal open={!!editing} term={editing} onClose={() => setEditing(null)} onSaved={upsertLocal} />

      <ConfirmDialog
        open={!!deleting}
        title="Excluir card"
        message={`Excluir "${deleting?.term}" permanentemente?`}
        confirmLabel="Excluir"
        danger
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      <SaveTermModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        standalone
        initialTerm=""
        sentence=""
        language={lang}
        documentId={null}
        lineIndex={null}
        onSaved={prependLocal}
      />
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-md p-1.5 text-muted hover:bg-surface-2',
        danger ? 'hover:text-rose-400' : 'hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
