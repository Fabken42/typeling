# Typeling — Especificação Completa do Produto

> Documento de especificação para geração do site completo. Tudo que estiver aqui é decisão fechada.
> Onde houver ambiguidade, siga a alternativa marcada como **padrão**.

---

## 1. Visão geral

**Typeling** é um site de estudo de idiomas por digitação. O usuário faz upload de legendas de
filmes/séries, letras de música ou textos avulsos; o site quebra o conteúdo em linhas e o usuário
treina digitando cada linha, com feedback caractere a caractere (verde = correto, vermelho = errado).
Durante o treino ele pode salvar palavras ou trechos com tradução e a frase de contexto, e depois
revisá-los em flashcards com repetição espaçada (algoritmo FSRS, igual ao Anki).

O site é de uso pessoal e monousuário-por-conta: **todo conteúdo é privado do usuário que o criou**.
Não há compartilhamento, feed público, nem conteúdo entre usuários.

### Fluxo principal

1. Usuário entra com Google (único método de autenticação).
2. Faz upload de um arquivo (ex.: `Death Note - Ep 03.ja.srt`) ou cola um texto, e informa o idioma.
3. Vê uma prévia das linhas extraídas, ajusta a limpeza se quiser, e salva.
4. No dashboard, vê cards dos seus documentos com barra de progresso (`linha 30 de 90 · 33%`),
   filtra por idioma e ordena.
5. Clica num card e cai na página de jogo, retomando exatamente na linha onde parou.
6. Digita as linhas. Salva palavras que não conhece (com tradução automática via DeepL).
7. Depois, revisa as palavras salvas em flashcards com 4 botões (Errei / Difícil / Bom / Fácil).

---

## 2. Stack técnica

| Camada | Escolha |
|---|---|
| Framework | **Next.js 15** (App Router, TypeScript, diretório `src/`) |
| Estilo | **Tailwind CSS** |
| Estado client | **Zustand** |
| Ícones | **lucide-react** |
| Banco | **MongoDB Atlas** via **Mongoose** |
| Auth | **NextAuth v5 (Auth.js)** — Google OAuth apenas, com `@auth/mongodb-adapter` |
| SRS | **ts-fsrs** |
| Tradução | **DeepL API Free** (server-side) |
| TTS | **Web Speech API** (`window.speechSynthesis`, nativo do browser) |
| Deploy | **Vercel** |

### Dependências

```
next react react-dom typescript
tailwindcss
zustand
lucide-react
mongoose
next-auth@beta @auth/mongodb-adapter mongodb
ts-fsrs
clsx tailwind-merge
date-fns
```

Nada além disso é necessário. **Não** use bibliotecas de detecção de encoding ou de idioma
(a seção 5.2 explica por quê), nem bibliotecas de parsing de legenda (os parsers são triviais
e estão especificados na seção 5.1).

### Variáveis de ambiente

```env
# Valores reais ficam em .env.local (não versionado). Veja .env.example.
MONGODB_URI=<sua-connection-string-do-atlas>
AUTH_SECRET=<gerar-com: npx auth secret>
AUTH_GOOGLE_ID=<seu-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<seu-client-secret>
DEEPL_API_KEY=<sua-chave-deepl>:fx
AUTH_URL=http://localhost:3000   # em produção: https://typeling.vercel.app
```

---

## 3. Idiomas suportados

Lista fechada. Cada documento tem exatamente um idioma.

| Código | Nome (UI) | Bandeira | Usa espaços? | IME? | Encoding legado (fallback) | DeepL source |
|---|---|---|---|---|---|---|
| `en` | Inglês | 🇬🇧 | sim | não | `windows-1252` | `EN` |
| `es` | Espanhol | 🇪🇸 | sim | não | `windows-1252` | `ES` |
| `fr` | Francês | 🇫🇷 | sim | não | `windows-1252` | `FR` |
| `de` | Alemão | 🇩🇪 | sim | não | `windows-1252` | `DE` |
| `it` | Italiano | 🇮🇹 | sim | não | `windows-1252` | `IT` |
| `ja` | Japonês | 🇯🇵 | **não** | **sim** | `shift_jis` | `JA` |
| `ko` | Coreano | 🇰🇷 | sim | **sim** | `euc-kr` | `KO` |
| `zh` | Chinês | 🇨🇳 | **não** | **sim** | `gb18030` | `ZH` |
| `ru` | Russo | 🇷🇺 | sim | não | `windows-1251` | `RU` |
| `vi` | Vietnamita | 🇻🇳 | sim | não | `windows-1258` | `VI` |

Idioma de destino das traduções: definido nas configurações do usuário, **padrão `pt-BR`**.

---

## 4. Modelo de dados (Mongoose)

### 4.1 Observação crítica sobre a coexistência Auth.js + Mongoose

O `@auth/mongodb-adapter` usa o **driver nativo do MongoDB**, não o Mongoose. Os dois vão coexistir
na mesma base:

- O adapter cria e gerencia as coleções `users`, `accounts`, `sessions`, `verification_tokens`.
- Os models Mongoose (`Document`, `Term`, `ReviewLog`, `Settings`, `TranslationCache`) referenciam
  o usuário por `userId: ObjectId` apontando para a coleção `users` do adapter.
- Use **uma única `MongoClient` promise** para o adapter e **uma conexão Mongoose cacheada** para os
  models. Ambos leem a mesma `MONGODB_URI`.
- Estratégia de sessão: **database** (padrão com adapter), para ter um `user.id` estável.

Cache de conexão Mongoose obrigatório (o hot-reload do Next em dev abre conexões infinitas sem isso):

```ts
// src/lib/mongoose.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!
let cached = (global as any).__mongoose ?? { conn: null, promise: null }
;(global as any).__mongoose = cached

export async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }
  cached.conn = await cached.promise
  return cached.conn
}
```

### 4.2 `Document` — um arquivo/texto importado

```ts
{
  _id: ObjectId,
  userId: ObjectId,              // ref users
  title: String,                 // editável; default = nome do arquivo sem extensão
  language: String,              // 'en' | 'es' | ... (enum da seção 3)
  source: String,                // 'file' | 'text'
  originalFileName: String?,     // só quando source === 'file'
  lines: [String],               // as linhas já limpas, prontas para jogar
  lineCount: Number,             // = lines.length (denormalizado para listagens)

  progress: {
    currentLine: Number,         // índice 0-based da última linha em que o usuário esteve
    totalKeystrokes: Number,     // acumulado, para estatística de acurácia
    correctKeystrokes: Number,
    lastPlayedAt: Date?,
  },

  createdAt: Date,
  updatedAt: Date,
}
```

**Regras:**
- `lines` é embutido no documento. Um episódio tem ~400 linhas — cabe folgado no limite de 16 MB do
  BSON. Valide no upload: **máximo 20.000 linhas e 2 MB de texto total**; acima disso, rejeite com
  mensagem clara.
- A barra de progresso é **posicional**: `(currentLine + 1) / lineCount`. Reflete a linha atual sobre
  o total — pular para a linha 25 de 50 mostra 50%, e chegar à última linha mostra 100%. O progresso
  acompanha a posição atual (pode regredir ao voltar uma linha). Use o helper `progressRatio()`.
- O texto "linha 30 de 90" usa `currentLine + 1` e `lineCount`.

**Índices:**
```js
{ userId: 1, createdAt: -1 }
{ userId: 1, language: 1, createdAt: -1 }
{ userId: 1, 'progress.lastPlayedAt': -1 }
```

### 4.3 `Term` — palavra/trecho salvo (é também o flashcard)

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  language: String,              // herdado do documento de origem
  term: String,                  // obrigatório
  reading: String?,              // leitura/pronúncia — opcional, útil para ja/zh/ko
  translation: String,           // obrigatório
  sentence: String,              // frase de contexto (a linha inteira)
  notes: String?,
  tags: [String],

  documentId: ObjectId?,         // origem, para poder voltar ao contexto
  lineIndex: Number?,

  suspended: Boolean,            // default false — card suspenso não entra na fila

  // objeto Card do ts-fsrs, salvo inteiro
  fsrs: {
    due: Date,
    stability: Number,
    difficulty: Number,
    elapsed_days: Number,
    scheduled_days: Number,
    reps: Number,
    lapses: Number,
    state: Number,               // 0=New 1=Learning 2=Review 3=Relearning
    last_review: Date?,
    learning_steps: Number?,     // presente em versões novas do ts-fsrs
  },

  createdAt: Date,
  updatedAt: Date,
}
```

> **Importante:** crie o `fsrs` com `createEmptyCard()` do ts-fsrs e persista o objeto retornado
> **inteiro** (use `Schema.Types.Mixed` ou `{ strict: false }` nesse subdocumento). Assim, se a
> versão do ts-fsrs adicionar campos, nada quebra.

**Índices:**
```js
{ userId: 1, 'fsrs.due': 1 }
{ userId: 1, language: 1, createdAt: -1 }
{ userId: 1, term: 1 }
```

### 4.4 `ReviewLog` — histórico de revisões

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  termId: ObjectId,
  rating: Number,                // 1=Again 2=Hard 3=Good 4=Easy
  state: Number,
  due: Date,
  stability: Number,
  difficulty: Number,
  elapsed_days: Number,
  last_elapsed_days: Number,
  scheduled_days: Number,
  review: Date,                  // quando a revisão aconteceu
}
```

Índice: `{ userId: 1, review: -1 }` (usado para calcular os limites diários).

### 4.5 `Settings` — um documento por usuário

```ts
{
  userId: ObjectId,                 // unique
  nativeLanguage: String,           // default 'pt-BR' — destino das traduções DeepL
  ignoreDiacritics: Boolean,        // default false
  requireCorrectToAdvance: Boolean, // default false
  requireSpaces: Boolean,           // default true (ignorado em ja/zh)
  ttsEnabled: Boolean,              // default true
  ttsAutoPlay: Boolean,             // default false — autoplay do áudio no treino e nos flashcards
  ttsRate: Number,                  // 0.5–1.5, default 0.9
  dailyNewLimit: Number,            // default 20
  dailyReviewLimit: Number,         // default 200
  theme: String,                    // 'dark' | 'light' | 'system' — default 'dark'
}
```

Criado com valores padrão no primeiro acesso (upsert lazy).

### 4.6 `TranslationCache` — economiza cota do DeepL

```ts
{
  key: String,        // `${sourceLang}:${targetLang}:${text}` — unique
  text: String,
  translation: String,
  createdAt: Date,
}
```

---

## 5. Importação de conteúdo

### 5.1 Parsers

Formatos aceitos: **`.srt`, `.ass`, `.ssa`, `.vtt`, `.lrc`, `.txt`** — mais o textarea de texto colado.
Todo o parsing acontece **no navegador**; o servidor recebe apenas o array de strings final.
Não há upload de arquivo binário, não há storage de blobs.

Os timestamps são descartados e **nunca** salvos no banco.

#### `.srt`
```
1
00:00:01,000 --> 00:00:04,000
Primeira linha
Segunda linha

2
...
```
Algoritmo: normalize `\r\n` → `\n`, remova BOM, divida por linhas em branco. Em cada bloco: descarte
a linha de índice numérico (se houver) e a linha de timestamp (contém `-->`); junte o restante.

#### `.vtt`
Igual ao `.srt`, mas: descarte a linha `WEBVTT` e o bloco de header até a primeira linha em branco;
timestamps usam `.` no lugar de `,` e podem ter configurações depois (`align:start position:10%`);
pode haver um identificador de cue antes do timestamp — descarte-o; descarte blocos `NOTE` e `STYLE`.

#### `.ass` / `.ssa`
Só interessa a seção `[Events]`. Considere apenas linhas que começam com `Dialogue:` (ignore
`Comment:`). O texto é **tudo após a 9ª vírgula**
(`line.slice('Dialogue:'.length).split(',').slice(9).join(',')`). Depois:
- remova blocos de override `{...}` (regex `/\{[^}]*\}/g`)
- substitua `\N` e `\n` por espaço, e `\h` por espaço normal

#### `.lrc`
Remova o prefixo de timestamp `[mm:ss.xx]` (pode haver vários na mesma linha). Descarte linhas de
metadado: `[ar:`, `[ti:`, `[al:`, `[by:`, `[offset:`, `[re:`, `[ve:`.

#### `.txt` e textarea
Divida por `\n`. Nada mais.

### 5.2 Detecção de encoding — sem biblioteca

O usuário informa o idioma **antes** do parsing, então a heurística é simples e confiável:

```ts
function decodeFile(buffer: ArrayBuffer, language: string, override?: string): string {
  if (override) return new TextDecoder(override).decode(buffer)
  try {
    // UTF-8 estrito: lança se o arquivo não for UTF-8 válido
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder(LEGACY_ENCODING[language]).decode(buffer)
  }
}
```

`LEGACY_ENCODING` é a coluna "Encoding legado" da tabela da seção 3. Todos esses encodings são
suportados nativamente pelo `TextDecoder` de qualquer browser moderno.

Na tela de prévia, ofereça um `<select>` de encoding manual (`utf-8`, `shift_jis`, `euc-kr`,
`gb18030`, `big5`, `windows-1251`, `windows-1252`, `windows-1258`) que re-decodifica na hora — caso
o texto ainda apareça corrompido.

### 5.3 Pipeline de limpeza

Aplicado após o parsing, na ordem abaixo. Cada item marcado com ☑ é um **toggle na tela de prévia**,
com o valor padrão indicado.

1. Remover tags HTML (`<i>`, `<b>`, `<font ...>`, fechamentos) — sempre.
2. Colapsar espaços múltiplos e fazer `trim()` — sempre.
3. ☑ **[ON]** Juntar as múltiplas linhas de um mesmo bloco de legenda em uma só.
   Separador: espaço para idiomas com espaço; **string vazia** para `ja` e `zh`.
4. ☑ **[ON]** Remover traços de diálogo alternado no início da linha (`- `, `– `, `— `).
5. ☑ **[ON]** Remover linhas que contêm apenas símbolos musicais (`♪`, `♫`, `~`) e remover esses
   símbolos das linhas que os têm junto com texto.
6. ☑ **[ON]** Remover conteúdo entre colchetes `[...]` e `【...】` (efeitos sonoros, rótulos de
   personagem). **Parênteses `()` NÃO são removidos por padrão** — costumam ser conteúdo legítimo.
7. ☑ **[ON]** Remover linhas de crédito: que casem, case-insensitive, com
   `legendado por|legenda:|tradução:|subtitles? by|sync(ed)? by|ripped by|www\.|https?://`.
8. ☑ **[ON]** Remover linhas consecutivas idênticas (legendas repetem muito).
9. Descartar linhas vazias ou que não contenham nenhuma letra/ideograma
   (`/[\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u`) — sempre.

### 5.4 Tela de upload (`/upload`)

Um único formulário com duas abas: **Arquivo** e **Texto**.

- **Arquivo**: dropzone (arrastar e soltar + clique) aceitando as extensões da seção 5.1.
- **Texto**: `<textarea>` grande, uma linha de conteúdo por linha de texto.

Campos comuns:
- **Título** (obrigatório; pré-preenchido com o nome do arquivo sem extensão)
- **Idioma** (obrigatório; `<select>` com os 10 idiomas + bandeira)

Ao escolher arquivo/colar texto e escolher o idioma, mostre imediatamente a **prévia**:
- contador: `142 linhas extraídas` (e, se houve descarte, `· 23 linhas removidas pela limpeza`)
- lista rolável das linhas resultantes, numeradas, cada uma com um botão 🗑 para excluí-la
  individualmente
- os toggles da seção 5.3 e o select de encoding, que re-processam ao vivo
- botão **Salvar documento** → `POST /api/documents` → redireciona para `/play/[id]`

Validações: ≥ 1 linha, ≤ 20.000 linhas, ≤ 2 MB de texto, título não vazio, idioma selecionado.

---

## 6. A engine de digitação (parte mais crítica do projeto)

### 6.1 Modelo de slots

Cada caractere da linha alvo vira um **slot**:

```ts
type Slot = {
  char: string       // o caractere original, exibido na tela
  typable: boolean   // false = o cursor pula automaticamente
}
```

Um slot é **não-digitável** (`typable: false`) quando:
- é pontuação ou símbolo — `/[\p{P}\p{S}]/u` (cobre `.,!?;:'"-—…` e as versões CJK `、。「」！？…`);
- **ou** é espaço e (o idioma é `ja`/`zh` **ou** `settings.requireSpaces === false`).

Espaços em idiomas que os usam são **digitáveis e obrigatórios** por padrão.

### 6.2 Normalização de comparação

```ts
function norm(ch: string, settings): string {
  let c = ch.toLocaleLowerCase()
  if (settings.ignoreDiacritics) {
    c = c.normalize('NFD').replace(/\p{M}/gu, '')       // é→e, ü→u, ế→e
    c = EXPLICIT_MAP[c] ?? c                             // ß→s, ø→o, đ→d, ł→l, ı→i
  }
  return c
}
```

- Maiúsculas vs. minúsculas **nunca** importam.
- Diacríticos importam por padrão (`ignoreDiacritics: false`), porque em fr/es/de/vi eles fazem parte
  da palavra. O toggle existe para quem não tem teclado configurado (essencial para vietnamita).
- **Equivalências multi-caractere estão fora de escopo** (`ß`↔`ss`, `ü`↔`ue`, `æ`↔`ae`) — elas
  quebrariam o mapeamento 1-para-1 entre slot e caractere digitado.

### 6.3 Algoritmo de avaliação

O estado da linha é **derivado inteiramente do valor atual do input** a cada mudança. Nada de
acumular estado por tecla — isso faz backspace, colar, seleção e substituição do IME funcionarem
de graça.

```ts
type SlotResult = 'pending' | 'correct' | 'wrong' | 'skipped'

function evaluate(slots: Slot[], input: string, settings) {
  const results: SlotResult[] = new Array(slots.length).fill('pending')
  const typedChars: (string | null)[] = new Array(slots.length).fill(null)
  let si = 0, ci = 0

  while (si < slots.length) {
    const slot = slots[si]

    if (!slot.typable) {
      // Tolerante: se o usuário digitou exatamente essa pontuação, consome.
      // Se não digitou, apenas pula. Ambos são aceitos.
      if (ci < input.length && norm(input[ci], settings) === norm(slot.char, settings)) ci++
      results[si] = 'skipped'
      si++
      continue
    }

    if (ci >= input.length) break   // ainda não chegou aqui

    const typed = input[ci]
    results[si] = norm(typed, settings) === norm(slot.char, settings) ? 'correct' : 'wrong'
    typedChars[si] = typed
    si++; ci++
  }

  const extras     = input.slice(ci)   // digitou além do fim da linha
  const cursorSlot = si                // próximo slot a ser digitado
  const isComplete = results.every(r => r !== 'pending')
  const isPerfect  = isComplete && extras.length === 0 && results.every(r => r !== 'wrong')

  return { results, typedChars, extras, cursorSlot, isComplete, isPerfect }
}
```

Custo: O(n) por tecla com n ≈ 60. Irrelevante.

### 6.4 Renderização (estilo Monkeytype)

A linha alvo é **sempre visível**. Cada slot é um `<span>`:

| Estado | Aparência |
|---|---|
| `pending` | caractere em `text-zinc-600` (cinza apagado) |
| `correct` | caractere em `text-emerald-400` |
| `wrong` | o **caractere esperado** em `text-rose-400`, com `bg-rose-500/15` e `underline decoration-rose-500` |
| `skipped` | `text-zinc-500` (pontuação, nunca marcada como erro) |
| slot do cursor | recebe um caret animado (barra vertical piscando) |
| `extras` | anexados ao final em `text-rose-400 bg-rose-500/25` |

Requisitos de CSS:
- container com `white-space: pre-wrap` (para os espaços não colapsarem) e `position: relative`
- `user-select: text` no container do texto — **é isso que permite selecionar palavras com o mouse**
- fonte grande (`text-3xl`/`text-4xl`), `leading-relaxed`, largura máxima confortável
- pilha de fontes com bom suporte CJK: `Inter, "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", sans-serif`

### 6.5 Captura de teclas e IME

Use **um `<input type="text">` real** (não `contentEditable`, não listener global de `keydown` para
o texto). Ele fica:

- absolutamente posicionado **exatamente sobre o slot do cursor** (calcule via
  `spanRef.getBoundingClientRect()` num `useLayoutEffect` que reage à mudança de `cursorSlot`)
- `opacity: 0; caret-color: transparent; background: transparent; border: none; outline: none`
- **nunca** `display: none`, `visibility: hidden`, nem posicionado fora da tela

> **Por que a posição importa:** a janela de candidatos do IME (japonês/coreano/chinês) é ancorada
> pelo sistema operacional na posição de *layout* do campo focado. Se o input estiver fora da tela,
> os candidatos aparecem fora da tela e o app fica inutilizável nesses idiomas. `opacity: 0` mantém
> a posição de layout real, então funciona.

Atributos obrigatórios no input: `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="off"`,
`spellCheck={false}`.

#### Eventos de composição

```ts
const [isComposing, setIsComposing] = useState(false)
const [compositionStart, setCompositionStart] = useState(0)

onCompositionStart = () => {
  setCompositionStart(inputRef.current!.selectionStart ?? value.length)
  setIsComposing(true)
}
onCompositionUpdate = () => { /* apenas re-renderiza */ }
onCompositionEnd = (e) => {
  setIsComposing(false)
  setValue(e.currentTarget.value)   // agora sim, avalia normalmente
}
onChange = (e) => setValue(e.target.value)
```

Enquanto `isComposing === true`:
- avalie apenas `value.slice(0, compositionStart)` (a parte já confirmada) com o algoritmo da 6.3;
- renderize `value.slice(compositionStart)` — o buffer em composição — **inline, na posição do
  cursor, em `text-sky-400 underline decoration-dotted`**, sem marcar nada como erro;
- **não** avance de linha.

#### O bug clássico do Enter

Durante a composição, `Enter` serve para **confirmar o candidato do IME**, não para avançar a linha.
Ignorar isso faz o app pular linhas sozinho toda vez que o usuário digita japonês.

```ts
onKeyDown = (e) => {
  if (e.nativeEvent.isComposing || e.keyCode === 229) return   // <- obrigatório
  if (e.key === 'Enter') { e.preventDefault(); handleAdvance() }
}
```

### 6.6 Avanço de linha

`Enter` é a **única** forma de concluir uma linha.

- Por padrão (`requireCorrectToAdvance: false`), `Enter` **sempre** avança para a próxima linha,
  mesmo se tiver erros — a acurácia fica registrada nos contadores de keystrokes.
- Com `requireCorrectToAdvance: true`, `Enter` só avança se `isPerfect === true`; caso contrário,
  aplique um shake na linha e não avance.
- Ao avançar: acumule `totalKeystrokes += slots.filter(s => s.typable).length` e
  `correctKeystrokes += results.filter(r => r === 'correct').length`; limpe o input; `currentLine++`.
- Na **última linha**, ao dar Enter: mostre uma tela de conclusão
  (`Documento concluído! 90/90 · acurácia 94%`) com *Voltar ao dashboard* e *Recomeçar do início*.

### 6.7 Salvamento de progresso

- Zustand mantém `currentLine` e os contadores em memória — a UI é instantânea.
- Persistência: `POST /api/documents/:id/progress` com **debounce de 2 segundos** após qualquer
  mudança.
- Adicionalmente, um flush no `visibilitychange` (quando `document.visibilityState === 'hidden'`)
  usando `navigator.sendBeacon`. **Por isso a rota é `POST` e não `PATCH`** — `sendBeacon` só faz POST.
- Ao abrir `/play/[id]`, o jogo começa em `progress.currentLine`.

---

## 7. Página de jogo (`/play/[documentId]`)

### 7.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Dashboard    Death Note — Ep 03   🇯🇵                 ⚙   │  header
├──────────────────────────────────────────────────────────────┤
│  ████████████████░░░░░░░░░░░░░░░  linha 30 de 90 · 33%       │  barra
├──────────────────────────────────────────────────────────────┤
│                                                              │
│         夜神月は死神のノートを拾った。                          │  ← LINHA ATUAL
│         (verde/vermelho/cinza, fonte grande, centralizada)    │     (só ela)
│                                                              │
│                  🔊    ⧉    ＋ Salvar palavra                 │  ações
│                                                              │
├──────────────────────────────────────────────────────────────┤
│     ◀ Anterior      [ 30 ] / 90  Ir       Próxima ▶          │  navegação
└──────────────────────────────────────────────────────────────┘
```

**Apenas a linha atual é exibida.** Nunca a anterior, nunca a próxima.

### 7.2 Botões de ação

- **🔊 Ouvir** (`Volume2`): fala a linha atual via Web Speech API (seção 10). Desabilitado com
  tooltip explicativo se não houver voz instalada para o idioma.
- **⧉ Copiar** (`Copy`): copia a linha inteira para a área de transferência. Feedback: o ícone vira
  `Check` verde por 1,5 s. Botão discreto (ghost, cinza).
- **＋ Salvar palavra** (`BookmarkPlus`): abre o modal da seção 8.

### 7.3 Navegação

- **◀ Anterior** / **Próxima ▶**: mudam `currentLine` (e, portanto, o progresso posicional).
  Desabilitados nos extremos.
- **Ir para linha**: input numérico **1-based** (o usuário vê "linha 30", então digita 30 → índice 29).
  Clamp em `[1, lineCount]`. Enter dentro desse input executa o pulo e devolve o foco ao input do jogo.
- Trocar de linha **sempre** limpa o input digitado e o `pendingSelection`.

### 7.4 Atalhos de teclado

| Tecla | Ação |
|---|---|
| `Enter` | conclui a linha e avança (respeitando o `isComposing`) |
| `Alt + ←` / `Alt + →` | linha anterior / próxima (sem concluir) |
| `Ctrl/Cmd + S` | abre o modal Salvar palavra (`preventDefault`) |
| `Ctrl/Cmd + Enter` | idem |
| `Tab` | revela o próximo caractere ainda não digitado (dica) — `preventDefault` |
| `Ctrl/Cmd + Shift + R` | revela a linha inteira (não conta para a acurácia) |
| `Esc` | fecha o modal aberto |

As setas puras (`←`/`→`) **não** são capturadas — elas pertencem à edição do texto no input.

### 7.5 Seleção de texto com o mouse (o detalhe que faz o botão "salvar palavra" funcionar)

O input transparente rouba o foco; se ele for re-focado enquanto existe uma seleção, o browser
**limpa a seleção**. O fluxo correto é:

1. Listener de `mouseup` no container do texto:
   ```ts
   const sel = window.getSelection()
   const text = sel?.toString().trim() ?? ''
   const insideLine = sel?.anchorNode && lineRef.current?.contains(sel.anchorNode)
   if (text && insideLine) setPendingSelection(text)
   else setPendingSelection(null)
   ```
2. **Enquanto `pendingSelection` não for nulo, NÃO re-foque o input.** A seleção continua visível.
3. Mostre um chip flutuante `＋ Salvar "夜神月"` logo acima da seleção (posicionado com
   `sel.getRangeAt(0).getBoundingClientRect()`) — atalho visual para abrir o modal.
4. Um listener global de `keydown` devolve o foco ao input assim que o usuário digita qualquer
   tecla imprimível (`e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey`), limpando
   a seleção e o chip.
5. `pendingSelection` é limpo ao trocar de linha e ao fechar o modal.

O duplo-clique para selecionar uma palavra inteira funciona nativamente, mesmo com cada caractere
em seu próprio `<span>` — os browsers atravessam fronteiras de elementos inline na seleção por
palavra. Nenhum trabalho extra é necessário.

---

## 8. Modal "Salvar palavra"

Abre de três formas: botão `＋ Salvar palavra`, `Ctrl+S`/`Ctrl+Enter`, ou o chip flutuante da seleção.

### Campos

| Campo | Preenchimento inicial | Obrigatório |
|---|---|---|
| **Termo** | `pendingSelection` se houver; caso contrário, vazio e com autofoco | sim |
| **Leitura / pronúncia** | vazio (colapsado atrás de "+ mais campos") | não |
| **Tradução** | preenchido automaticamente pelo DeepL (ver abaixo) | sim |
| **Frase de referência** | **a linha atual completa**, sempre | sim |
| **Notas** | vazio (colapsado) | não |
| **Tags** | vazio (colapsado), input de chips | não |

O modal também guarda, invisivelmente, `documentId`, `lineIndex` e `language` do documento atual.

### Tradução automática

- Se o modal abriu **com termo preenchido** (havia seleção): dispare a tradução imediatamente ao
  abrir. Mostre um spinner discreto dentro do campo Tradução.
- Se abriu **com termo vazio**: não chame a API. Após o usuário digitar o termo e sair do campo
  (`onBlur`), dispare a tradução automaticamente **se o campo Tradução ainda estiver vazio**.
- Sempre há um botão **🌐 Traduzir** (`Languages`) ao lado do campo, que traduz o conteúdo atual do
  campo Termo e **anexa** o resultado ao que já houver no campo Tradução (separado por `. `),
  preservando o que o usuário digitou (ex.: a leitura). Se o campo estiver vazio, só coloca a tradução.
- **Só o termo é traduzido, nunca a frase inteira.**
- Se a chamada falhar (erro de rede, cota, idioma não suportado), mostre um aviso inline discreto
  — `Tradução automática indisponível, preencha manualmente` — e deixe o campo editável e vazio.
  **A falha do DeepL nunca bloqueia o salvamento.**

### Duplicatas

Antes de salvar, verifique se já existe um `Term` do mesmo usuário com o mesmo `term` (comparação
case-insensitive) e mesmo `language`. Se existir, mostre um aviso com três opções:

- **Adicionar frase ao card existente** — anexa a nova frase ao campo `sentence` do card antigo
  (separando com ` / `) e não cria card novo;
- **Criar mesmo assim** — cria um segundo card;
- **Cancelar**.

### Ações

`Salvar` (cria o `Term` com `createEmptyCard()`) e `Cancelar`. `Esc` cancela. Após salvar, um toast
`"夜神月" salvo` com link *Desfazer* (5 s) e o foco volta ao input do jogo.

### Modos (`standalone` / `continuous`)

- **`standalone`** (a partir de `/vocabulary`): mostra um seletor de idioma e torna a frase de
  referência opcional (não há documento de contexto).
- **`continuous`** (adição em massa em `/vocabulary`): ao salvar, o modal **permanece aberto** com um
  formulário limpo (mantendo o idioma), em vez de fechar — o usuário adiciona palavra após palavra
  sem reabrir. Fecha só com `Cancelar`/`Esc`. O campo **Idioma** já vem preenchido com o último
  idioma que o usuário usou para adicionar (persistido em `localStorage`).

---

## 9. Tradução — DeepL (server-side)

`POST /api/translate` — **rota autenticada**. A chave nunca chega ao client.

Request: `{ text: string, sourceLang: string, targetLang: string }`
Response: `{ translation: string }` ou `{ error: string }` com status apropriado.

Implementação:
1. Valide a sessão. Rejeite `text` vazio ou com mais de 200 caracteres (é palavra/trecho, não frase).
2. Consulte `TranslationCache` pela chave `${sourceLang}:${targetLang}:${text}`. Se houver, retorne.
3. Chame o DeepL:
   ```
   POST https://api-free.deepl.com/v2/translate
   Authorization: DeepL-Auth-Key <DEEPL_API_KEY>
   Content-Type: application/json

   { "text": ["<termo>"], "source_lang": "JA", "target_lang": "PT-BR" }
   ```
   Resposta: `{ "translations": [{ "detected_source_language": "JA", "text": "Light Yagami" }] }`
4. Grave no cache e retorne.
5. Em qualquer erro (4xx, 5xx, timeout de 8 s), retorne `{ error }` com uma mensagem legível. O
   client trata isso como "preencha manualmente", nunca como falha fatal.

Códigos de idioma: use a coluna "DeepL source" da tabela da seção 3 para `source_lang`, e o
`settings.nativeLanguage` (`PT-BR`) para `target_lang`. Se o DeepL retornar 400 para um idioma de
origem não suportado, trate como o caso de falha acima — o preenchimento manual cobre o caso.

---

## 10. Áudio — Web Speech API

Componente reutilizável `<SpeakButton text language />`, usado na página de jogo e nos flashcards.

```ts
// Vozes carregam de forma assíncrona; sem isso, getVoices() retorna [] no primeiro render.
useEffect(() => {
  const load = () => setVoices(speechSynthesis.getVoices())
  load()
  speechSynthesis.addEventListener('voiceschanged', load)
  return () => speechSynthesis.removeEventListener('voiceschanged', load)
}, [])

const voice = voices.find(v => v.lang.toLowerCase().startsWith(language))
```

Ao clicar:
```ts
speechSynthesis.cancel()                 // interrompe uma fala anterior
const u = new SpeechSynthesisUtterance(text)
u.voice = voice
u.lang  = BCP47[language]                // 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', ...
u.rate  = settings.ttsRate
speechSynthesis.speak(u)
```

- Se `voice` for `undefined`, o botão fica desabilitado com tooltip:
  `Nenhuma voz de japonês instalada neste dispositivo`.
- Estado visual: ícone `Volume2` normal, `Loader2` girando durante a fala (`onstart`/`onend`).
- Se `settings.ttsEnabled === false`, o botão não é renderizado.
- **Reprodução automática** (`settings.ttsAutoPlay`, padrão desligado): fala automaticamente ao
  aparecer novo conteúdo. Requer `ttsEnabled`. Reaproveita a mesma lógica do botão via o hook
  `useSpeech` (`src/lib/speech.ts`).
  - **No treino** (`/play`): fala a linha atual ao avançar com Enter, navegar ou pular.
  - **Nos flashcards** (`/review`): ao surgir um card, fala a frase de exemplo (ou o termo, se não
    houver frase).

---

## 11. Dashboard (`/dashboard`)

Grade responsiva de cards (1 coluna no mobile / 2 no tablet / 3 no desktop).

### Card de documento
```
┌──────────────────────────────────┐
│ 🇯🇵  Death Note — Ep 03      ⋮   │
│                                  │
│ ████████████░░░░░░░░░░░  33%     │
│ linha 30 de 90                   │
│                                  │
│ há 2 dias · 90 linhas            │
└──────────────────────────────────┘
```
- O card inteiro é clicável → `/play/[id]`.
- Menu `⋮` (`MoreVertical`): **Renomear**, **Alterar idioma**, **Zerar progresso**, **Excluir**
  (com confirmação por diálogo).
- Documento com 100% de progresso ganha um selo `✓ Concluído` em verde.

### Controles no topo
- **Busca** por título (client-side, debounce 300 ms).
- **Filtro por idioma**: `<select>` com "Todos os idiomas" + os idiomas que o usuário efetivamente tem.
- **Ordenação**: `Mais recentes` (padrão) · `Mais antigos` · `Jogado recentemente` · `Título (A-Z)` ·
  `Maior progresso` · `Menor progresso`.
- Filtro e ordenação persistem na URL como query params (`?lang=ja&sort=recent`) para o estado
  sobreviver a um refresh.

### Estado vazio
Ilustração + "Nenhum documento ainda" + botão `＋ Adicionar conteúdo` → `/upload`.

---

## 12. Vocabulário (`/vocabulary`)

Lista/tabela de todos os `Term` do usuário.

Colunas: **Termo** (com a leitura embaixo, se houver) · **Tradução** · **Frase** (truncada, com
tooltip do texto completo) · **Idioma** (bandeira) · **Próxima revisão** (`hoje`, `em 3 dias`,
`novo`) · **Ações**.

- **Busca**: por termo ou tradução.
- **Filtros**: idioma, documento de origem, `apenas suspensos`.
- **Ordenação**: `Mais recentes` (padrão) · `Mais antigos` · `Alfabética` · `Próximos da revisão`.
- **Ações por linha**: Editar (modal com todos os campos), Suspender/Reativar,
  Ir para o contexto (`/play/[documentId]?line=N`), Excluir.
- Botão de destaque no topo: **Revisar agora (12 cards)** → `/review`.

---

## 13. Flashcards (`/review`)

### 13.1 Algoritmo — ts-fsrs

```ts
import { fsrs, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs'

const f = fsrs(generatorParameters({ enable_fuzz: true }))
// Ao avaliar (use f.next() ou f.repeat() conforme a API da versão instalada):
const { card, log } = f.next(term.fsrs, new Date(), rating)
```

Salve `card` de volta em `term.fsrs` e crie um `ReviewLog` a partir de `log`. **Toda a avaliação
acontece no servidor** (`POST /api/review/:termId`), para que a data seja confiável.

Mapeamento dos botões:

| Botão | Rating | Cor |
|---|---|---|
| Errei | `Rating.Again` (1) | `rose` |
| Difícil | `Rating.Hard` (2) | `amber` |
| Bom | `Rating.Good` (3) | `emerald` |
| Fácil | `Rating.Easy` (4) | `sky` |

Acima de cada botão, mostre o **intervalo previsto** (`10 min`, `1 d`, `4 d`, `9 d`), calculado com
`f.repeat(card, now)`, que devolve os quatro cenários de uma vez. É o comportamento do Anki e vale
muito a pena.

### 13.2 Montagem da fila

Fila **única e global**, filtrável por idioma e por documento (query params). Não há decks.

- **Vencidos**: `fsrs.due <= agora`, `state !== New`, `suspended: false`.
- **Novos**: `state === New`, `suspended: false`, ordenados por `createdAt` ascendente.
- **Limites diários**: conte no `ReviewLog` quantas revisões e quantos cards novos já foram feitos
  **desde a virada do dia** e respeite `dailyNewLimit` / `dailyReviewLimit`.
- **Virada do dia às 04:00 no fuso do usuário** (igual ao Anki), não à meia-noite: quem estuda de
  madrugada não deve pular de dia no meio da sessão. Calcule o limite como "hoje às 04:00 local; se
  agora for antes disso, ontem às 04:00" e converta para UTC na query.
- Intercale vencidos e novos (não deixe todos os novos no fim).

### 13.3 Interface do card

**Frente:**
```
                夜神月                      ← termo, text-5xl
              やがみ ライト                  ← leitura, se houver, text-lg zinc-400
                                 🔊

    ┌────────────────────────────────────────┐
    │ 夜神月は死神のノートを拾った。            │   ← frase, com o termo em negrito
    └────────────────────────────────────────┘      (destaque por match de substring)
                                 🔊

             [ Mostrar resposta ]
```

**Verso:** tudo da frente, mais a tradução em destaque e as notas, e os 4 botões no lugar do
"Mostrar resposta".

### 13.4 Atalhos

| Tecla | Ação |
|---|---|
| `Espaço` ou `Enter` | mostra a resposta; depois de revelada, equivale a **Bom** |
| `1` `2` `3` `4` | Errei / Difícil / Bom / Fácil (só após revelar) |
| `E` | editar o card (abre modal) |
| `S` | suspender o card e pular |
| `Esc` | encerrar a sessão |

### 13.5 Fim de sessão

Resumo: total revisado, distribuição dos 4 ratings, tempo gasto, quantos ainda restam hoje.
Botões *Voltar ao vocabulário* e *Continuar estudando* (se ainda houver fila).

Se não houver nada a revisar ao entrar: estado vazio amigável com a data da próxima revisão
pendente (`Próxima revisão: amanhã, 14 cards`).

---

## 14. Configurações (`/settings`)

**Idioma e tradução** — Idioma nativo (destino das traduções): `pt-BR` (padrão), `en`, `es`.

**Digitação**
- Ignorar acentos e diacríticos — *"Aceita `cafe` no lugar de `café`. Útil se seu teclado não tem
  os caracteres do idioma."* (padrão: desligado)
- Exigir espaços — *"Ignorado em japonês e chinês."* (padrão: ligado)
- Exigir linha correta para avançar — *"Com isso ligado, o Enter só passa de linha quando tudo
  estiver certo."* (padrão: desligado)

**Áudio**
- Ativar botões de pronúncia (padrão: ligado)
- Reprodução automática do áudio no treino e nos flashcards (padrão: desligado; exige os botões de pronúncia ativos)
- Velocidade da fala — slider 0.5 a 1.5 (padrão: 0.9)
- Lista das vozes detectadas por idioma, para o usuário saber o que falta instalar no sistema.

**Revisão**
- Novos cards por dia (padrão 20)
- Revisões por dia (padrão 200)

**Aparência** — Tema: Escuro (padrão) / Claro / Sistema.

**Conta** — e-mail Google, botão Sair, e "Excluir todos os meus dados" (com confirmação por digitação
do e-mail).

---

## 15. Rotas

### Páginas
```
/                      landing simples; se logado, redireciona para /dashboard
/login                 botão "Entrar com Google"
/upload                importação
/dashboard             lista de documentos
/play/[documentId]     jogo de digitação   (aceita ?line=N para pular direto)
/vocabulary            lista de termos salvos
/review                sessão de flashcards (aceita ?lang=ja&doc=<id>)
/settings              configurações
```

Todas exceto `/` e `/login` são protegidas: sem sessão → redirect para `/login`.
Use um `middleware.ts` do Auth.js para isso.

### API (Route Handlers, todas autenticadas)
```
POST   /api/documents                    cria documento a partir das linhas parseadas
GET    /api/documents                    lista (?lang=&sort=&q=)
GET    /api/documents/:id                detalhe, com as linhas
PATCH  /api/documents/:id                título, idioma
DELETE /api/documents/:id
POST   /api/documents/:id/progress       { currentLine, totalKeystrokes, correctKeystrokes }
POST   /api/documents/:id/reset          zera o progresso

POST   /api/terms                        cria termo/card
GET    /api/terms                        lista (?lang=&doc=&q=&sort=&suspended=)
PATCH  /api/terms/:id
DELETE /api/terms/:id
GET    /api/terms/check?term=&lang=      verificação de duplicata

GET    /api/review/queue                 (?lang=&doc=) devolve a fila do dia
POST   /api/review/:termId               { rating: 1|2|3|4 } → agenda com ts-fsrs
GET    /api/review/stats                 contagens para os badges

POST   /api/translate                    DeepL
GET    /api/settings
PATCH  /api/settings
```

**Toda rota deve verificar `session.user.id` e filtrar por `userId`.** Um usuário jamais pode ler ou
escrever dados de outro — inclua o `userId` em toda query, não apenas o `_id`.

---

## 16. Estrutura de pastas

```
src/
  app/
    layout.tsx
    page.tsx
    login/page.tsx
    (app)/                        # grupo com o shell autenticado (header + nav)
      layout.tsx
      dashboard/page.tsx
      upload/page.tsx
      play/[documentId]/page.tsx
      vocabulary/page.tsx
      review/page.tsx
      settings/page.tsx
    api/
      auth/[...nextauth]/route.ts
      documents/route.ts
      documents/[id]/route.ts
      documents/[id]/progress/route.ts
      documents/[id]/reset/route.ts
      terms/route.ts
      terms/[id]/route.ts
      terms/check/route.ts
      review/queue/route.ts
      review/[termId]/route.ts
      review/stats/route.ts
      translate/route.ts
      settings/route.ts
  components/
    ui/                           # Button, Modal, Select, Toggle, Toast, Tooltip, ProgressBar
    game/
      TypingLine.tsx              # renderização dos slots
      TypingInput.tsx             # input transparente + IME
      GameControls.tsx
      SaveTermModal.tsx
      SelectionChip.tsx
    dashboard/DocumentCard.tsx
    review/Flashcard.tsx
    SpeakButton.tsx
    LanguageBadge.tsx
  lib/
    mongoose.ts
    auth.ts                       # configuração do NextAuth
    deepl.ts
    fsrs.ts
    parsers/
      srt.ts  vtt.ts  ass.ts  lrc.ts  txt.ts  index.ts
    text/
      decode.ts                   # TextDecoder + fallback por idioma
      clean.ts                    # pipeline de limpeza
      slots.ts                    # buildSlots + norm + evaluate
    languages.ts                  # a tabela da seção 3
  models/
    Document.ts  Term.ts  ReviewLog.ts  Settings.ts  TranslationCache.ts
  store/
    gameStore.ts                  # Zustand: linha atual, input, seleção, progresso
    reviewStore.ts                # Zustand: fila, índice, revelado
  middleware.ts
```

---

## 17. Design

- **Dark-first.** Fundo `zinc-950`, superfícies `zinc-900`, bordas `zinc-800`, texto `zinc-100`.
  Acento: `emerald-500`. O tema claro é uma inversão coerente dos mesmos tokens; use variáveis CSS.
- Cores semânticas fixas em todo o app: acerto `emerald-400`, erro `rose-400`, neutro/pendente
  `zinc-600`, composição de IME `sky-400`.
- **A página de jogo é minimalista** — sem sidebar, sem distrações. Header fino, texto grande e
  centralizado, controles discretos que só ganham contraste no hover.
- As demais páginas usam um shell com header contendo o logo **Typeling**, a navegação
  (Dashboard · Vocabulário · Revisar · Configurações) e o avatar do Google com dropdown.
- O item "Revisar" no menu exibe um badge com o número de cards vencidos.
- Ícones **exclusivamente** do `lucide-react`. Sugestões: `Upload`, `LayoutDashboard`, `BookMarked`,
  `Brain`, `Settings`, `Volume2`, `Copy`, `Check`, `BookmarkPlus`, `Languages`, `ChevronLeft`,
  `ChevronRight`, `MoreVertical`, `Trash2`, `Pencil`, `Loader2`, `Search`, `Filter`, `ArrowUpDown`.
- Responsivo, mas **desktop-first**: dashboard, vocabulário e flashcards funcionam bem no celular;
  a página de jogo é otimizada para teclado físico.
- Interface **em português (pt-BR)**. Não há troca de idioma da interface.

---

## 18. Critérios de aceite

Estes são os pontos onde uma implementação ingênua quebra. Todos precisam funcionar:

1. Digitar `Hes gonna kill me` para a linha `He's gonna kill me!` é **100% correto** — o apóstrofo e
   a exclamação são pulados automaticamente.
2. Digitar `He's gonna kill me!` (com a pontuação) para a mesma linha **também** é 100% correto.
3. `HE'S GONNA` e `he's gonna` são equivalentes.
4. Em japonês, ao digitar `やがみ` no IME e ver os candidatos, **nada fica vermelho** enquanto a
   composição está ativa, e o `Enter` que confirma o candidato **não avança a linha**.
5. A janela de candidatos do IME aparece perto do cursor, não em um canto da tela.
6. Selecionar `夜神月` com o mouse e clicar em "Salvar palavra" abre o modal com o campo Termo já
   preenchido — a seleção **não** é apagada antes de ser capturada.
7. Abrir o modal sem seleção deixa Termo e Tradução vazios e a Frase de referência preenchida com a
   linha atual.
8. Dar Enter na linha 50, voltar para a linha 10 e dar Enter de novo **não** faz a barra de progresso
   regredir.
9. Fechar a aba no meio da linha 30 e reabrir o documento retoma exatamente na linha 30.
10. Um `.srt` japonês em Shift-JIS é decodificado corretamente, sem mojibake.
11. Um bloco de legenda com duas linhas vira **uma** linha de jogo — sem espaço em japonês, com
    espaço em inglês.
12. Se o DeepL estiver fora do ar ou sem cota, ainda é possível salvar a palavra normalmente.
13. Se o dispositivo não tem voz de coreano instalada, o botão de áudio aparece desabilitado com
    explicação, e nada quebra.
14. Um usuário não consegue, por manipulação de URL ou de request, ler ou alterar documentos e
    termos de outro usuário.
15. Após avaliar um card como "Bom", ele desaparece da fila do dia e reaparece na data agendada
    pelo FSRS.
16. Backspace, colar texto e selecionar-e-substituir dentro do input do jogo recolorem a linha
    corretamente (consequência de derivar o estado do valor do input, e não de acumular por tecla).

---

## 19. Ordem de implementação sugerida

1. Projeto Next + Tailwind + shell, models Mongoose, conexão com o Atlas.
2. Auth.js com Google + middleware de proteção + `Settings` com upsert lazy.
3. Parsers + decode + pipeline de limpeza (com testes unitários dos parsers) + tela `/upload` com prévia.
4. `/dashboard` com cards, filtros e ordenação.
5. **Engine de digitação** — slots, `evaluate`, renderização, input transparente, composição de IME,
   avanço de linha, salvamento de progresso. *(É a etapa mais longa; faça-a com calma.)*
6. Seleção com mouse + modal de salvar palavra + rota `/api/translate` com cache.
7. `/vocabulary` com filtros, edição e exclusão.
8. `/review` com ts-fsrs, os 4 botões, previsão de intervalos, limites diários e virada às 04:00.
9. `SpeakButton` (TTS) na página de jogo e nos flashcards.
10. `/settings`, tema claro, atalhos de teclado, toasts e polimento responsivo.
