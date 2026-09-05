# Typeling

Estude idiomas por digitação. Envie legendas (`.srt`, `.ass`, `.ssa`, `.vtt`,
`.lrc`, `.txt`) ou cole um texto, treine linha por linha com feedback caractere
a caractere (verde = correto, vermelho = errado), salve palavras com tradução
automática (DeepL) e revise em flashcards com repetição espaçada (FSRS).

Uso pessoal e monousuário-por-conta: **todo conteúdo é privado do usuário que o
criou**.

## Stack

- **Next.js 15** (App Router, TypeScript, `src/`)
- **Tailwind CSS** · **Zustand** · **lucide-react**
- **MongoDB Atlas** via **Mongoose** (+ `@auth/mongodb-adapter` para o Auth.js)
- **NextAuth v5 (Auth.js)** — login apenas com Google, sessão em banco
- **ts-fsrs** para o agendamento dos flashcards
- **DeepL API Free** (server-side) para tradução
- **Web Speech API** (nativa) para pronúncia

## Configuração

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as variáveis
   (`MONGODB_URI`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   `DEEPL_API_KEY`, `AUTH_URL`).
3. No Google Cloud Console, adicione a URI de callback autorizada:
   `http://localhost:3000/api/auth/callback/google`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:3000` |
| `npm run build` | Build de produção |
| `npm start` | Servir o build |
| `npm test` | Testes das funções críticas (parsers, limpeza, engine de digitação) |
| `npm run lint` | ESLint |

## Estrutura

```
src/
  app/                    # rotas (App Router) + route handlers em app/api
    (app)/                # shell autenticado: dashboard, upload, vocabulary,
                          #   review, settings
    play/[documentId]/    # jogo de digitação (layout minimalista próprio)
    login/ · page.tsx     # login e landing
  components/             # ui/, game/, dashboard/, review/, e compartilhados
  lib/                    # languages, mongoose, auth, deepl, fsrs, review,
                          #   parsers/, text/ (decode, clean, slots)
  models/                 # Mongoose: Document, Term, ReviewLog, Settings,
                          #   TranslationCache
  store/                  # Zustand: gameStore, reviewStore, settingsStore
  middleware.ts           # checagem rápida de cookie de sessão
```

## Notas de arquitetura

- **Auth.js + Mongoose coexistem** na mesma base: o adapter usa o driver nativo
  do MongoDB (uma `MongoClient` promise única) e gerencia
  `users/accounts/sessions/verification_tokens`; os models Mongoose usam uma
  conexão cacheada e referenciam `userId`.
- **Parsing e limpeza acontecem no navegador**; o servidor recebe apenas o array
  de strings final. Timestamps nunca são salvos.
- **A engine de digitação deriva o estado inteiramente do valor do input** a cada
  mudança — por isso backspace, colar e substituição de IME funcionam de graça.
- **Toda revisão FSRS acontece no servidor**, para que a data seja confiável.
- Toda rota de API verifica `session.user.id` e filtra por `userId`.
