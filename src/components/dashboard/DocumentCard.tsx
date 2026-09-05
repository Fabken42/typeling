'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreVertical,
  Pencil,
  Languages,
  RotateCcw,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input, Label } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LanguageBadge } from '@/components/LanguageBadge'
import { relativeTime, cn } from '@/lib/utils'
import { LANGUAGE_LIST } from '@/lib/languages'
import type { DocumentSummaryDTO } from '@/lib/serialize'

interface Props {
  doc: DocumentSummaryDTO
  // Mutations are optimistic and owned by the dashboard (see DashboardClient).
  onRename: (id: string, title: string) => void
  onChangeLanguage: (id: string, language: string) => void
  onReset: (id: string) => void
  onDelete: (id: string) => void
}

export function DocumentCard({ doc, onRename, onChangeLanguage, onReset, onDelete }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState(doc.title)
  const [language, setLanguage] = useState(doc.language)
  const menuRef = useRef<HTMLDivElement>(null)

  const completed = doc.progress.completedCount
  const ratio = doc.lineCount > 0 ? completed / doc.lineCount : 0
  const pct = Math.round(ratio * 100)
  const done = doc.lineCount > 0 && completed >= doc.lineCount
  const lastPlayed = doc.progress.lastPlayedAt

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function rename() {
    const t = title.trim()
    if (!t) return
    onRename(doc.id, t)
    setRenameOpen(false)
  }

  function changeLang() {
    onChangeLanguage(doc.id, language)
    setLangOpen(false)
  }

  function reset() {
    onReset(doc.id)
    setResetOpen(false)
  }

  function remove() {
    onDelete(doc.id)
    setDeleteOpen(false)
  }

  return (
    <>
      <div
        onClick={() => router.push(`/play/${doc.id}`)}
        className="group relative cursor-pointer rounded-xl border border-border bg-surface p-4 transition-colors hover:border-emerald-500/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <LanguageBadge language={doc.language} />
            <h3 className="truncate font-medium">{doc.title}</h3>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Ações"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-xl animate-fade-in"
              >
                <MenuItem icon={Pencil} onClick={() => { setMenuOpen(false); setTitle(doc.title); setRenameOpen(true) }}>
                  Renomear
                </MenuItem>
                <MenuItem icon={Languages} onClick={() => { setMenuOpen(false); setLanguage(doc.language); setLangOpen(true) }}>
                  Alterar idioma
                </MenuItem>
                <MenuItem icon={RotateCcw} onClick={() => { setMenuOpen(false); setResetOpen(true) }}>
                  Zerar progresso
                </MenuItem>
                <MenuItem icon={Trash2} danger onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}>
                  Excluir
                </MenuItem>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={ratio} />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted">
              {done ? 'concluído' : `linha ${doc.progress.currentLine + 1} de ${doc.lineCount}`}
            </span>
            <span className={cn('font-medium', done ? 'text-emerald-400' : 'text-muted')}>
              {pct}%
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-faint">
          {lastPlayed ? <span>{relativeTime(lastPlayed)}</span> : <span>nunca jogado</span>}
          <span>·</span>
          <span>{doc.lineCount} linhas</span>
          {done && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">
              <CheckCircle2 size={12} /> Concluído
            </span>
          )}
        </div>
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Renomear documento">
        <Label htmlFor="rename">Título</Label>
        <Input id="rename" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={rename} disabled={!title.trim()}>Salvar</Button>
        </div>
      </Modal>

      <Modal open={langOpen} onClose={() => setLangOpen(false)} title="Alterar idioma">
        <Label htmlFor="lang">Idioma</Label>
        <Select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGE_LIST.map((l) => (
            <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
          ))}
        </Select>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setLangOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={changeLang}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={resetOpen}
        title="Zerar progresso"
        message={`Isso apaga o progresso de "${doc.title}" e volta para a primeira linha.`}
        confirmLabel="Zerar"
        danger
        onConfirm={reset}
        onCancel={() => setResetOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir documento"
        message={`Excluir "${doc.title}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={remove}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: typeof Pencil
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2',
        danger ? 'text-rose-400' : 'text-fg',
      )}
    >
      <Icon size={15} />
      {children}
    </button>
  )
}
