import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import TranslationCacheModel from '@/models/TranslationCache'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { translateWithDeepl } from '@/lib/deepl'

// POST /api/translate — DeepL, authenticated. The key never reaches the client
// (spec section 9). Failures return { error } and are non-fatal for the caller.
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    await requireUserId()
    const body = await req.json()

    const text = String(body.text ?? '').trim()
    const sourceLang = String(body.sourceLang ?? '')
    const targetLang = String(body.targetLang ?? 'PT-BR')

    if (!text) return errorJson('Texto vazio')
    if (text.length > 200) return errorJson('Texto muito longo (máx. 200)')

    await dbConnect()
    const key = `${sourceLang}:${targetLang}:${text}`

    const cached = await TranslationCacheModel.findOne({ key }).lean()
    if (cached) return json({ translation: cached.translation })

    const result = await translateWithDeepl(text, sourceLang, targetLang)
    if (result.error || !result.translation) {
      return errorJson(result.error ?? 'Tradução indisponível', 502)
    }

    // Cache best-effort; a duplicate-key race is harmless.
    try {
      await TranslationCacheModel.create({
        key,
        text,
        translation: result.translation,
      })
    } catch {
      /* ignore cache write races */
    }

    return json({ translation: result.translation })
  })
}
