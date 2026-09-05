import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Keyboard, Languages, Brain } from 'lucide-react'
import { safeAuth } from '@/lib/session'

export default async function LandingPage() {
  const session = await safeAuth()
  if (session?.user?.id) redirect('/dashboard')

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-5xl items-center px-6">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 font-bold text-white">
            T
          </span>
          <span className="text-lg font-semibold">Typeling</span>
        </div>
        <Link
          href="/login"
          className="ml-auto rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-balance text-5xl font-bold tracking-tight">
          Aprenda idiomas <span className="text-emerald-400">digitando</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Envie legendas de filmes, letras de música ou textos e treine linha
          por linha, com feedback caractere a caractere. Salve palavras e revise
          com repetição espaçada.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-medium text-white hover:bg-emerald-500"
        >
          Começar com Google
        </Link>

        <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
          {[
            {
              icon: Keyboard,
              title: 'Digite qualquer texto',
              desc: 'SRT, ASS, VTT, LRC, TXT ou colado. Suporte a IME para japonês, coreano e chinês.',
            },
            {
              icon: Languages,
              title: 'Salve e traduza',
              desc: 'Selecione palavras durante o treino e traduza automaticamente com DeepL.',
            },
            {
              icon: Brain,
              title: 'Revise com FSRS',
              desc: 'Flashcards com repetição espaçada, o mesmo algoritmo do Anki.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <f.icon className="text-emerald-400" size={22} />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
