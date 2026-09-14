'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  Type,
  Trash2,
  AlertCircle,
  Files,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { api } from '@/lib/client'
import {
  LANGUAGE_LIST,
  MANUAL_ENCODINGS,
  isLanguageCode,
  type LanguageCode,
} from '@/lib/languages'
import { decodeFile } from '@/lib/text/decode'
import { parse, formatFromFileName, ACCEPTED_EXTENSIONS } from '@/lib/parsers'
import { cleanBlocks, CLEAN_DEFAULTS, type CleanOptions } from '@/lib/text/clean'
import { collectEntries, titleFromName, type UploadEntry } from '@/lib/upload'
import type { DocumentDTO } from '@/lib/serialize'

const MAX_LINES = 20000

const TOGGLE_LABELS: { key: keyof CleanOptions; label: string }[] = [
  { key: 'joinBlockLines', label: 'Juntar linhas do mesmo bloco de legenda' },
  { key: 'removeDialogDashes', label: 'Remover traços de diálogo (-, –, —)' },
  { key: 'removeMusicSymbols', label: 'Remover símbolos musicais (♪ ♫ ~)' },
  { key: 'removeBrackets', label: 'Remover conteúdo entre colchetes [ ] e 【 】' },
  { key: 'removeCredits', label: 'Remover linhas de crédito e URLs' },
  { key: 'removeConsecutiveDuplicates', label: 'Remover linhas repetidas consecutivas' },
]

// Decode → parse → clean for one entry, returning the cleaned lines and count.
function processEntry(
  data: Uint8Array | ArrayBuffer,
  name: string,
  language: LanguageCode,
  opts: CleanOptions,
  encoding: string,
): { lines: string[]; removed: number } {
  let raw = ''
  try {
    raw = decodeFile(data, language, encoding || undefined)
  } catch {
    return { lines: [], removed: 0 }
  }
  if (!raw.trim()) return { lines: [], removed: 0 }
  const blocks = parse(raw, formatFromFileName(name))
  const res = cleanBlocks(blocks, language, opts)
  return { lines: res.lines, removed: res.removed }
}

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [tab, setTab] = useState<'file' | 'text'>('file')
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState<LanguageCode | ''>('')
  const [opts, setOpts] = useState<CleanOptions>({ ...CLEAN_DEFAULTS })
  const [encoding, setEncoding] = useState<string>('') // '' = auto
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState<{ done: number; total: number } | null>(null)

  // File tab
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Text tab
  const [pastedText, setPastedText] = useState('')

  // Single-mode manual line deletions.
  const [removedIdx, setRemovedIdx] = useState<Set<number>>(new Set())

  const batch = tab === 'file' && entries.length > 1
  const single = tab === 'text' || (tab === 'file' && entries.length === 1)

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    setLoadingFiles(true)
    try {
      const { entries: found, skipped } = await collectEntries(files)
      setEntries((prev) => [...prev, ...found])
      if (skipped > 0) {
        toast({
          message: `${skipped} arquivo(s) ignorado(s) (formato não suportado)`,
          variant: 'error',
        })
      }
      // Pre-fill the title when it becomes a single file.
      if (found.length === 1 && entries.length === 0 && !title) {
        setTitle(titleFromName(found[0].name))
      }
    } finally {
      setLoadingFiles(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  // ----- Single-mode preview -----
  const singleRaw = useMemo(() => {
    if (tab === 'text') return pastedText
    if (entries.length === 1) {
      try {
        return decodeFile(entries[0].data, (language || 'en') as LanguageCode, encoding || undefined)
      } catch {
        return ''
      }
    }
    return ''
  }, [tab, pastedText, entries, language, encoding])

  const { baseLines, removed } = useMemo(() => {
    if (!single || !language || !singleRaw.trim())
      return { baseLines: [] as string[], removed: 0 }
    const format = tab === 'file' ? formatFromFileName(entries[0]?.name ?? '') : 'txt'
    const blocks = parse(singleRaw, format)
    const res = cleanBlocks(blocks, language as LanguageCode, opts)
    return { baseLines: res.lines, removed: res.removed }
  }, [single, singleRaw, language, opts, tab, entries])

  useEffect(() => {
    setRemovedIdx(new Set())
  }, [baseLines])

  const singleLines = useMemo(
    () => baseLines.filter((_, i) => !removedIdx.has(i)),
    [baseLines, removedIdx],
  )

  // ----- Batch-mode summaries -----
  const batchSummaries = useMemo(() => {
    if (!batch || !language) return []
    return entries.map((e) => {
      const { lines, removed } = processEntry(
        e.data,
        e.name,
        language as LanguageCode,
        opts,
        encoding,
      )
      return { id: e.id, name: e.name, count: lines.length, removed }
    })
  }, [batch, entries, language, opts, encoding])

  const batchValidCount = batchSummaries.filter((s) => s.count > 0).length

  // ----- Actions -----
  async function saveSingle() {
    if (!title.trim()) return toast({ message: 'Informe um título', variant: 'error' })
    if (!isLanguageCode(language)) return toast({ message: 'Selecione o idioma', variant: 'error' })
    if (singleLines.length === 0) return toast({ message: 'Nenhuma linha para salvar', variant: 'error' })
    if (singleLines.length > MAX_LINES)
      return toast({ message: `Máximo de ${MAX_LINES} linhas`, variant: 'error' })

    setSaving(true)
    try {
      const doc = await api.post<DocumentDTO>('/api/documents', {
        title: title.trim(),
        language,
        source: tab,
        originalFileName: tab === 'file' ? entries[0]?.name : undefined,
        lines: singleLines,
      })
      // Success is silent — navigating straight into the game is the feedback.
      router.push(`/play/${doc.id}`)
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Falha ao salvar', variant: 'error' })
      setSaving(false)
    }
  }

  async function createBatch() {
    if (!isLanguageCode(language)) return toast({ message: 'Selecione o idioma', variant: 'error' })
    const toCreate = entries
      .map((e) => ({
        e,
        ...processEntry(e.data, e.name, language as LanguageCode, opts, encoding),
      }))
      .filter((x) => x.lines.length > 0)

    if (toCreate.length === 0) return toast({ message: 'Nenhum arquivo com linhas válidas', variant: 'error' })

    setCreating({ done: 0, total: toCreate.length })
    let ok = 0
    let failed = 0
    for (const { e, lines } of toCreate) {
      try {
        await api.post<DocumentDTO>('/api/documents', {
          title: titleFromName(e.name),
          language,
          source: 'file',
          originalFileName: e.name,
          lines,
        })
        ok++
      } catch {
        failed++
      }
      setCreating((c) => (c ? { ...c, done: c.done + 1 } : c))
    }
    setCreating(null)
    if (ok > 0) {
      // Only surface a toast if some files failed; full success is silent.
      if (failed > 0) {
        toast({ message: `${failed} arquivo(s) falharam ao salvar`, variant: 'error' })
      }
      router.push('/dashboard')
    } else {
      toast({ message: 'Nenhum documento foi criado', variant: 'error' })
    }
  }

  const hasContent = tab === 'file' ? entries.length > 0 : pastedText.trim().length > 0

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Adicionar conteúdo</h1>
      <p className="mt-1 text-sm text-muted">
        Envie legendas, letras ou textos — vários arquivos ou um .zip de uma vez.
        Tudo é processado no seu navegador.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: input */}
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            <TabButton active={tab === 'file'} onClick={() => setTab('file')} icon={FileText}>
              Arquivo
            </TabButton>
            <TabButton active={tab === 'text'} onClick={() => setTab('text')} icon={Type}>
              Texto
            </TabButton>
          </div>

          {tab === 'file' ? (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                  dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-emerald-500/50',
                )}
              >
                {loadingFiles ? (
                  <Loader2 className="animate-spin text-muted" size={26} />
                ) : (
                  <Upload className="text-muted" size={26} />
                )}
                <p className="mt-3 text-sm font-medium">
                  Arraste arquivos ou clique para escolher
                </p>
                <p className="mt-1 text-xs text-muted">
                  {ACCEPTED_EXTENSIONS.join(', ')}, .zip · vários de uma vez
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={[...ACCEPTED_EXTENSIONS, '.zip'].join(',')}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>

              {entries.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Files size={14} />
                    {entries.length} arquivo{entries.length !== 1 ? 's' : ''} selecionado
                    {entries.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setEntries([])}
                    className="hover:text-fg"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </>
          ) : (
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole seu texto aqui — uma frase por linha."
              rows={10}
              className="min-h-[240px] resize-y font-mono"
            />
          )}

          {single && (
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Death Note — Ep 03"
              />
            </div>
          )}

          <div>
            <Label htmlFor="language">Idioma</Label>
            <Select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            >
              <option value="">Selecione o idioma…</option>
              {LANGUAGE_LIST.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </Select>
            {batch && (
              <p className="mt-1 text-xs text-muted">
                O idioma e a limpeza valem para todos os arquivos do lote.
              </p>
            )}
          </div>

          {tab === 'file' && (
            <div>
              <Label htmlFor="encoding">Codificação (se aparecer corrompido)</Label>
              <Select id="encoding" value={encoding} onChange={(e) => setEncoding(e.target.value)}>
                <option value="">Automática (UTF-8 → legado)</option>
                {MANUAL_ENCODINGS.map((enc) => (
                  <option key={enc} value={enc}>{enc}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Limpeza</h3>
            <div className="space-y-3">
              {TOGGLE_LABELS.map(({ key, label }) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={opts[key]}
                  onChange={(v) => setOpts((o) => ({ ...o, [key]: v }))}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{batch ? 'Arquivos do lote' : 'Prévia'}</h3>
            {single && hasContent && language && (
              <p className="text-xs text-muted">
                {singleLines.length} linha{singleLines.length !== 1 ? 's' : ''} extraída
                {singleLines.length !== 1 ? 's' : ''}
                {removed > 0 && ` · ${removed} removida${removed !== 1 ? 's' : ''} pela limpeza`}
              </p>
            )}
          </div>

          <div className="scroll-thin h-[520px] overflow-y-auto rounded-xl border border-border bg-surface">
            {!language ? (
              <Empty icon={AlertCircle} text="Selecione um idioma para ver a prévia." />
            ) : !hasContent ? (
              <Empty icon={FileText} text="Escolha arquivos ou cole um texto." />
            ) : batch ? (
              <ul className="divide-y divide-border">
                {batchSummaries.map((s) => (
                  <li key={s.id} className="group flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-2">
                    <FileText size={15} className="shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{titleFromName(s.name)}</p>
                      <p className="text-xs text-muted">
                        {s.count > 0 ? (
                          <>
                            {s.count} linhas
                            {s.removed > 0 && ` · ${s.removed} removidas`}
                          </>
                        ) : (
                          <span className="text-rose-400">nenhuma linha válida</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setEntries((prev) => prev.filter((e) => e.id !== s.id))}
                      className="shrink-0 text-faint opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                      aria-label="Remover arquivo"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : singleLines.length === 0 ? (
              <Empty icon={AlertCircle} text="Nenhuma linha após a limpeza." />
            ) : (
              <ul className="divide-y divide-border">
                {baseLines.map((line, i) =>
                  removedIdx.has(i) ? null : (
                    <li key={i} className="group flex items-start gap-3 px-3 py-2 text-sm hover:bg-surface-2">
                      <span className="w-8 shrink-0 select-none pt-0.5 text-right text-xs text-faint">
                        {baseLines.slice(0, i + 1).filter((_, j) => !removedIdx.has(j)).length}
                      </span>
                      <span className="flex-1 break-words">{line}</span>
                      <button
                        onClick={() => setRemovedIdx((prev) => new Set(prev).add(i))}
                        className="shrink-0 text-faint opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                        aria-label="Remover linha"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>

          {batch ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={createBatch}
              loading={!!creating}
              disabled={!language || batchValidCount === 0}
            >
              {creating
                ? `Criando ${creating.done}/${creating.total}…`
                : `Criar ${batchValidCount} documento${batchValidCount !== 1 ? 's' : ''}`}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={saveSingle}
              loading={saving}
              disabled={!hasContent || !language || singleLines.length === 0}
            >
              Salvar documento
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof FileText
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
      )}
    >
      <Icon size={16} />
      {children}
    </button>
  )
}

function Empty({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
      <Icon size={22} />
      <p className="max-w-[220px] text-sm">{text}</p>
    </div>
  )
}
