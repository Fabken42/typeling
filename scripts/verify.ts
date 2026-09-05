// Temporary verification of the critical engine logic against spec acceptance
// criteria (section 18). Run with: npx tsx scripts/verify.ts
import { parseSrt } from '@/lib/parsers/srt'
import { parseVtt } from '@/lib/parsers/vtt'
import { parseAss } from '@/lib/parsers/ass'
import { parseLrc } from '@/lib/parsers/lrc'
import { cleanBlocks, CLEAN_DEFAULTS } from '@/lib/text/clean'
import { buildSlots, evaluate } from '@/lib/text/slots'

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++
    console.log('  ✓', name)
  } else {
    fail++
    console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : '')
  }
}

const settings = { ignoreDiacritics: false, requireSpaces: true }

console.log('Parsers')
{
  const srt = `1
00:00:01,000 --> 00:00:04,000
Primeira linha
Segunda linha

2
00:00:05,000 --> 00:00:06,000
Terceira`
  const blocks = parseSrt(srt)
  check('srt: 2 blocks', blocks.length === 2, blocks)
  check('srt: first block 2 lines', blocks[0].length === 2, blocks[0])

  const vtt = `WEBVTT

NOTE this is a note

00:00:01.000 --> 00:00:04.000 align:start
Olá mundo`
  const vblocks = parseVtt(vtt)
  check('vtt: header+NOTE dropped, 1 block', vblocks.length === 1, vblocks)
  check('vtt: content correct', vblocks[0]?.[0] === 'Olá mundo', vblocks[0])

  const ass = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,{\\i1}Hello{\\i0}\\NWorld
Comment: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,ignore me`
  const ablocks = parseAss(ass)
  check('ass: 1 dialogue kept', ablocks.length === 1, ablocks)
  check('ass: overrides+\\N handled', ablocks[0]?.[0] === 'Hello World', ablocks[0])

  const lrc = `[ar:Artist]
[00:12.34]Linha um
[00:15.00][00:16.00]Linha dois`
  const lblocks = parseLrc(lrc)
  check('lrc: meta dropped, 2 lines', lblocks.length === 2, lblocks)
  check('lrc: timestamp stripped', lblocks[0]?.[0] === 'Linha um', lblocks[0])
}

console.log('Cleaning pipeline')
{
  // Criterion 11: two-line block -> one line (space in en).
  const en = cleanBlocks([['He is', 'gonna go']], 'en', CLEAN_DEFAULTS)
  check('en join with space', en.lines[0] === 'He is gonna go', en.lines)

  // Criterion 11: no space in ja.
  const ja = cleanBlocks([['夜神月は', '死神のノート']], 'ja', CLEAN_DEFAULTS)
  check('ja join without space', ja.lines[0] === '夜神月は死神のノート', ja.lines)

  const dash = cleanBlocks([['- Olá', '- Tudo bem?']], 'en', CLEAN_DEFAULTS)
  check('dialog dashes removed', dash.lines[0] === 'Olá Tudo bem?', dash.lines)

  const music = cleanBlocks([['♪ La la la ♪'], ['♪♪']], 'en', CLEAN_DEFAULTS)
  check('music symbols stripped + empty dropped', music.lines.length === 1 && music.lines[0] === 'La la la', music.lines)

  const brackets = cleanBlocks([['[música] Olá 【笑】']], 'en', CLEAN_DEFAULTS)
  check('brackets removed', brackets.lines[0] === 'Olá', brackets.lines)

  const credit = cleanBlocks([['Legendado por Fulano'], ['Frase real aqui']], 'en', CLEAN_DEFAULTS)
  check('credit line removed', credit.lines.length === 1 && credit.lines[0] === 'Frase real aqui', credit.lines)

  const html = cleanBlocks([['<i>Itálico</i> normal']], 'en', CLEAN_DEFAULTS)
  check('html tags removed', html.lines[0] === 'Itálico normal', html.lines)
}

console.log('Typing engine (evaluate)')
{
  const line = "He's gonna kill me!"
  const slots = buildSlots(line, 'en', settings)

  // Criterion 1: skip apostrophe and !.
  const r1 = evaluate(slots, 'Hes gonna kill me', settings)
  check('criterion 1: no-punct is perfect', r1.isPerfect, {
    complete: r1.isComplete,
    perfect: r1.isPerfect,
    results: r1.results.filter((x) => x === 'wrong').length,
  })

  // Criterion 2: with punctuation also perfect.
  const r2 = evaluate(slots, "He's gonna kill me!", settings)
  check('criterion 2: with-punct is perfect', r2.isPerfect)

  // Criterion 3: case-insensitive.
  const r3a = evaluate(slots, "HE'S GONNA KILL ME", settings)
  const r3b = evaluate(slots, 'hes gonna kill me', settings)
  check('criterion 3: case-insensitive perfect', r3a.isPerfect && r3b.isPerfect)

  // Wrong char is flagged.
  const r4 = evaluate(slots, 'Xes gonna kill me', settings)
  check('wrong first char flagged', r4.results[0] === 'wrong', r4.results.slice(0, 2))

  // Extras beyond the end.
  const r5 = evaluate(slots, 'Hes gonna kill mee', settings)
  check('extras detected', r5.extras.length === 1 && !r5.isPerfect, { extras: r5.extras })

  // Japanese: spaces are non-typable, punctuation skipped.
  const jaLine = '夜神月は、死神のノートを拾った。'
  const jaSlots = buildSlots(jaLine, 'ja', settings)
  const jaTyped = '夜神月は死神のノートを拾った' // no punctuation typed
  const rja = evaluate(jaSlots, jaTyped, settings)
  check('ja: punctuation auto-skipped -> perfect', rja.isPerfect, {
    perfect: rja.isPerfect,
    complete: rja.isComplete,
  })

  // Diacritics toggle: cafe matches café when ignoreDiacritics.
  const accLine = 'café'
  const accSlots = buildSlots(accLine, 'fr', settings)
  const accStrict = evaluate(accSlots, 'cafe', settings)
  const accLoose = evaluate(accSlots, 'cafe', { ignoreDiacritics: true, requireSpaces: true })
  check('diacritics strict: cafe != café', !accStrict.isPerfect)
  check('diacritics loose: cafe == café', accLoose.isPerfect)
}

console.log('')
console.log(`RESULT: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
