'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/client'
import type { TermDTO } from '@/lib/serialize'

interface TermEditModalProps {
  open: boolean
  term: TermDTO | null
  onClose: () => void
  onSaved: (term: TermDTO) => void
}

export function TermEditModal({ open, term, onClose, onSaved }: TermEditModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<TermDTO>>({})
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (open && term) {
      setForm({ ...term })
      setTagInput('')
    }
  }, [open, term])

  function set<K extends keyof TermDTO>(key: K, value: TermDTO[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/,$/, '')
    const tags = form.tags ?? []
    if (t && !tags.includes(t)) set('tags', [...tags, t])
    setTagInput('')
  }

  function save() {
    if (!form.term?.trim() || !term) {
      toast({ message: 'Termo não pode ser vazio', variant: 'error' })
      return
    }
    const original = term
    const payload = {
      term: form.term.trim(),
      reading: form.reading ?? '',
      translation: form.translation ?? '',
      sentence: form.sentence ?? '',
      notes: form.notes ?? '',
      tags: form.tags ?? [],
      suspended: form.suspended ?? false,
    }
    // Optimistic: reflect the edit and close immediately; PATCH in background.
    onSaved({ ...original, ...payload })
    onClose()
    api.patch<TermDTO>(`/api/terms/${original.id}`, payload).catch((e) => {
      onSaved(original) // revert on failure
      toast({
        message: e instanceof Error ? e.message : 'Falha ao atualizar card',
        variant: 'error',
      })
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar card" className="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="e-term">Termo</Label>
            <Input id="e-term" value={form.term ?? ''} onChange={(e) => set('term', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="e-reading">Leitura</Label>
            <Input id="e-reading" value={form.reading ?? ''} onChange={(e) => set('reading', e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="e-translation">Tradução</Label>
          <Input id="e-translation" value={form.translation ?? ''} onChange={(e) => set('translation', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="e-sentence">Frase de referência</Label>
          <Textarea id="e-sentence" rows={2} value={form.sentence ?? ''} onChange={(e) => set('sentence', e.target.value)} className="resize-y" />
        </div>
        <div>
          <Label htmlFor="e-notes">Notas</Label>
          <Textarea id="e-notes" rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className="resize-y" />
        </div>
        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-2">
            {(form.tags ?? []).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs">
                {t}
                <button onClick={() => set('tags', (form.tags ?? []).filter((x) => x !== t))}>
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
                }
              }}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder="adicionar tag…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </div>
        </div>
        <Toggle
          label="Suspender card"
          description="Cards suspensos não entram na fila de revisão."
          checked={form.suspended ?? false}
          onChange={(v) => set('suspended', v)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
