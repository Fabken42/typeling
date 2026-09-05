'use client'

import { useEffect, useRef, useState } from 'react'
import { LogOut, Loader2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { Input, Label } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSettingsStore } from '@/store/settingsStore'
import { signOutAction } from '@/app/actions'
import { api } from '@/lib/client'
import { LANGUAGE_LIST, NATIVE_LANGUAGES } from '@/lib/languages'
import type { ClientSettings } from '@/lib/settingsDefaults'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function SettingsClient({
  email,
  name,
  initialSettings,
}: {
  email: string
  name: string
  initialSettings: ClientSettings
}) {
  const { toast } = useToast()
  const settings = useSettingsStore((s) => s.settings)
  const hydrate = useSettingsStore((s) => s.hydrate)
  const update = useSettingsStore((s) => s.update)

  const [rate, setRate] = useState(initialSettings.ttsRate)
  const [newLimit, setNewLimit] = useState(String(initialSettings.dailyNewLimit))
  const [reviewLimit, setReviewLimit] = useState(String(initialSettings.dailyReviewLimit))
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const signOutForm = useRef<HTMLFormElement>(null)

  // Seed the settings store from server data (no fetch-on-mount).
  useEffect(() => {
    hydrate(initialSettings)
  }, [hydrate, initialSettings])

  useEffect(() => {
    setRate(settings.ttsRate)
    setNewLimit(String(settings.dailyNewLimit))
    setReviewLimit(String(settings.dailyReviewLimit))
  }, [settings.ttsRate, settings.dailyNewLimit, settings.dailyReviewLimit])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  function persist(patch: Parameters<typeof update>[0]) {
    update(patch).catch((e) =>
      toast({ message: e instanceof Error ? e.message : 'Erro ao salvar', variant: 'error' }),
    )
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      await api.del('/api/account')
      signOutForm.current?.requestSubmit()
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'Erro', variant: 'error' })
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Section title="Idioma e tradução">
        <div>
          <Label htmlFor="native">Idioma nativo (destino das traduções)</Label>
          <Select
            id="native"
            value={settings.nativeLanguage}
            onChange={(e) => persist({ nativeLanguage: e.target.value })}
          >
            {NATIVE_LANGUAGES.map((n) => (
              <option key={n.code} value={n.code}>{n.name}</option>
            ))}
          </Select>
        </div>
      </Section>

      <Section title="Digitação">
        <Toggle
          label="Ignorar acentos e diacríticos"
          description="Aceita “cafe” no lugar de “café”. Útil se seu teclado não tem os caracteres do idioma."
          checked={settings.ignoreDiacritics}
          onChange={(v) => persist({ ignoreDiacritics: v })}
        />
        <Toggle
          label="Exigir espaços"
          description="Ignorado em japonês e chinês."
          checked={settings.requireSpaces}
          onChange={(v) => persist({ requireSpaces: v })}
        />
        <Toggle
          label="Exigir linha correta para avançar"
          description="Com isso ligado, o Enter só passa de linha quando tudo estiver certo."
          checked={settings.requireCorrectToAdvance}
          onChange={(v) => persist({ requireCorrectToAdvance: v })}
        />
      </Section>

      <Section title="Áudio">
        <Toggle
          label="Ativar botões de pronúncia"
          checked={settings.ttsEnabled}
          onChange={(v) => persist({ ttsEnabled: v })}
        />
        <div>
          <div className="flex items-center justify-between">
            <Label>Velocidade da fala</Label>
            <span className="text-sm text-muted">{rate.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            onPointerUp={() => persist({ ttsRate: rate })}
            onKeyUp={() => persist({ ttsRate: rate })}
            className="mt-2 w-full accent-emerald-500"
          />
        </div>
        <div>
          <Label>Vozes detectadas por idioma</Label>
          <div className="mt-1 space-y-1">
            {LANGUAGE_LIST.map((l) => {
              const has = voices.some((v) => v.lang.toLowerCase().startsWith(l.code))
              return (
                <div key={l.code} className="flex items-center gap-2 text-sm">
                  <span className="w-28 text-muted">{l.flag} {l.name}</span>
                  {has ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <Volume2 size={14} /> disponível
                    </span>
                  ) : (
                    <span className="text-faint">nenhuma voz instalada</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      <Section title="Revisão">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="newLimit">Novos cards por dia</Label>
            <Input
              id="newLimit"
              inputMode="numeric"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value.replace(/\D/g, ''))}
              onBlur={() => persist({ dailyNewLimit: Number(newLimit || 0) })}
            />
          </div>
          <div>
            <Label htmlFor="reviewLimit">Revisões por dia</Label>
            <Input
              id="reviewLimit"
              inputMode="numeric"
              value={reviewLimit}
              onChange={(e) => setReviewLimit(e.target.value.replace(/\D/g, ''))}
              onBlur={() => persist({ dailyReviewLimit: Number(reviewLimit || 0) })}
            />
          </div>
        </div>
        <Toggle
          label="Modo cloze nos flashcards"
          checked={settings.clozeMode}
          onChange={(v) => persist({ clozeMode: v })}
        />
      </Section>

      <Section title="Aparência">
        <div>
          <Label htmlFor="theme">Tema</Label>
          <Select
            id="theme"
            value={settings.theme}
            onChange={(e) => persist({ theme: e.target.value as 'dark' | 'light' | 'system' })}
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Sistema</option>
          </Select>
        </div>
      </Section>

      <Section title="Conta">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-sm text-muted">{email}</p>
          </div>
          <form action={signOutAction}>
            <Button variant="secondary" type="submit">
              <LogOut size={16} /> Sair
            </Button>
          </form>
        </div>

        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <p className="text-sm font-medium text-rose-400">Excluir todos os meus dados</p>
          <p className="mt-1 text-xs text-muted">
            Apaga todos os seus documentos, termos e histórico de revisão. Esta ação não pode ser
            desfeita. Digite <span className="font-medium text-fg">{email}</span> para confirmar.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Digite seu e-mail"
              className="flex-1"
            />
            <Button
              variant="danger"
              disabled={deleteText !== email || deleting}
              onClick={deleteAccount}
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
              Excluir dados
            </Button>
          </div>
        </div>
      </Section>

      <form action={signOutAction} ref={signOutForm} className="hidden" />
    </div>
  )
}
