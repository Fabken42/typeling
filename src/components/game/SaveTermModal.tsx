'use client'

import { useEffect, useRef, useState } from 'react'
import { Languages, Loader2, Plus, X, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import { langInfo, LANGUAGE_LIST } from '@/lib/languages'
import { nativeToDeepl } from '@/lib/languages'
import { useSettingsStore } from '@/store/settingsStore'
import type { TermDTO } from '@/lib/serialize'

interface SaveTermModalProps {
  open: boolean
  onClose: () => void
  initialTerm: string
  sentence: string
  language: string
  documentId: string | null
  lineIndex: number | null
  onSaved?: (term: TermDTO) => void
  // Standalone mode (e.g. from /vocabulary): shows a language picker and makes
  // the reference sentence optional, since there is no document context.
  standalone?: boolean
}

export function SaveTermModal(props: SaveTermModalProps) {
  const { open, onClose, initialTerm, sentence, language, documentId, lineIndex, standalone } = props
  const { toast } = useToast()
  const nativeLanguage = useSettingsStore((s) => s.settings.nativeLanguage)

  // Language may be chosen inside the modal in standalone mode.
  const [lang, setLang] = useState(language)

  const [term, setTerm] = useState('')
  const [reading, setReading] = useState('')
  const [translation, setTranslation] = useState('')
  const [sentenceVal, setSentenceVal] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showMore, setShowMore] = useState(false)

  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<TermDTO[]>([])
  const termRef = useRef<HTMLInputElement>(null)

  const sourceLang = langInfo(lang)?.deeplSource ?? ''
  const targetLang = nativeToDeepl(nativeLanguage)

  // Reset all fields when the modal opens. Translation is never automatic — the
  // user triggers it with the translate icon (spec polish request).
  useEffect(() => {
    if (!open) return
    const t = initialTerm.trim()
    setLang(language)
    setTerm(t)
    setReading('')
    setTranslation('')
    setSentenceVal(sentence)
    setNotes('')
    setTags([])
    setTagInput('')
    setShowMore(false)
    setTranslateError(null)
    setTranslating(false)
    setSaving(false)
    setDuplicates([])
    setTimeout(() => termRef.current?.focus(), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function runTranslate(text: string) {
    const value = text.trim()
    if (!value) return
    setTranslating(true)
    setTranslateError(null)
    try {
      const r = await api.post<{ translation: string }>('/api/translate', {
        text: value,
        sourceLang,
        targetLang,
      })
      setTranslation(r.translation)
    } catch {
      // DeepL failure never blocks saving (spec 8/9) — allow manual fill.
      setTranslateError('Tradução automática indisponível, preencha manualmente')
    } finally {
      setTranslating(false)
    }
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/,$/, '')
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  async function handleSaveClick() {
    if (!term.trim()) {
      toast({ message: 'Informe o termo', variant: 'error' })
      return
    }
    if (!lang) {
      toast({ message: 'Selecione o idioma', variant: 'error' })
      return
    }
    // The reference sentence is required only in the in-game (contextual) flow.
    if (!standalone && !sentenceVal.trim()) {
      toast({ message: 'A frase de referência é obrigatória', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const enc = encodeURIComponent(term.trim())
      const { duplicates } = await api.get<{ duplicates: TermDTO[] }>(
        `/api/terms/check?term=${enc}&lang=${lang}`,
      )
      if (duplicates.length > 0) {
        setDuplicates(duplicates)
        setSaving(false)
        return
      }
      create('new')
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'Erro', variant: 'error' })
      setSaving(false)
    }
  }

  // Closes the modal immediately and fires the POST in the background (spec
  // polish request) — the toast reports success/undo when it resolves.
  function create(mode: 'new' | 'append', appendId?: string) {
    const termLabel = term.trim()
    const body =
      mode === 'append'
        ? {
            term: termLabel,
            language: lang,
            translation: translation.trim(),
            sentence: sentenceVal,
            appendToTermId: appendId,
          }
        : {
            term: termLabel,
            language: lang,
            translation: translation.trim(),
            sentence: sentenceVal,
            reading: reading.trim() || undefined,
            notes: notes.trim() || undefined,
            tags,
            documentId,
            lineIndex,
          }

    onClose()

    // Success is silent (no toast) — only failures surface (spec polish request).
    api
      .post<TermDTO>('/api/terms', body)
      .then((created) => props.onSaved?.(created))
      .catch((e) =>
        toast({
          message: e instanceof Error ? e.message : 'Falha ao salvar palavra',
          variant: 'error',
        }),
      )
  }

  const info = langInfo(lang)
  const showReading = info?.ime // useful for ja/zh/ko

  return (
    <Modal open={open} onClose={onClose} title="Salvar palavra" className="max-w-xl">
      {duplicates.length > 0 ? (
        <DuplicatePrompt
          duplicates={duplicates}
          onAppend={(id) => create('append', id)}
          onCreate={() => create('new')}
          onCancel={() => setDuplicates([])}
          saving={saving}
        />
      ) : (
        <div className="space-y-4">
          {standalone && (
            <div>
              <Label htmlFor="term-lang">Idioma</Label>
              <Select
                id="term-lang"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="">Selecione o idioma…</option>
                {LANGUAGE_LIST.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="term">Termo</Label>
            <Input
              id="term"
              ref={termRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Palavra ou trecho"
            />
          </div>

          <div>
            <Label htmlFor="translation">Tradução</Label>
            <div className="relative">
              <Input
                id="translation"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Tradução"
                className="pr-10"
              />
              <button
                onClick={() => runTranslate(term)}
                disabled={translating || !term.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50"
                aria-label="Traduzir"
                title="Traduzir com DeepL"
              >
                {translating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Languages size={16} />
                )}
              </button>
            </div>
            {translateError && (
              <p className="mt-1 text-xs text-amber-400">{translateError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sentence">
              Frase de referência{standalone && ' (opcional)'}
            </Label>
            <Textarea
              id="sentence"
              value={sentenceVal}
              onChange={(e) => setSentenceVal(e.target.value)}
              rows={2}
              className="resize-y"
              placeholder={standalone ? 'Uma frase de exemplo com o termo (opcional)' : undefined}
            />
          </div>

          {!showMore ? (
            <button
              onClick={() => setShowMore(true)}
              className="flex items-center gap-1 text-sm text-muted hover:text-fg"
            >
              <ChevronDown size={15} /> mais campos
            </button>
          ) : (
            <div className="space-y-4 border-t border-border pt-4">
              {showReading !== undefined && (
                <div>
                  <Label htmlFor="reading">Leitura / pronúncia</Label>
                  <Input
                    id="reading"
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-y"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs"
                    >
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTag(tagInput)
                      } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                        setTags(tags.slice(0, -1))
                      }
                    }}
                    onBlur={() => tagInput && addTag(tagInput)}
                    placeholder="adicionar tag…"
                    className="flex-1 bg-transparent text-base outline-none placeholder:text-faint sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveClick}
              loading={saving}
            >
              <Plus size={16} /> Salvar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function DuplicatePrompt({
  duplicates,
  onAppend,
  onCreate,
  onCancel,
  saving,
}: {
  duplicates: TermDTO[]
  onAppend: (id: string) => void
  onCreate: () => void
  onCancel: () => void
  saving: boolean
}) {
  const dup = duplicates[0]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Você já tem um card para{' '}
        <span className="font-medium text-fg">“{dup.term}”</span> neste idioma.
      </p>
      <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <p className="font-medium">{dup.translation || '(sem tradução)'}</p>
        <p className="mt-1 text-muted line-clamp-2">{dup.sentence}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={() => onAppend(dup.id)} loading={saving}>
          Adicionar frase ao card existente
        </Button>
        <Button variant="secondary" onClick={onCreate} loading={saving}>
          Criar mesmo assim
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
