// DeepL translation, server-side only (spec section 9). The key never reaches
// the client. Any failure is returned as an error string, never thrown to the
// caller as fatal — manual fill always covers the failure case.

const DEEPL_URL = 'https://api-free.deepl.com/v2/translate'

export interface DeeplResult {
  translation?: string
  error?: string
}

export async function translateWithDeepl(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<DeeplResult> {
  const key = process.env.DEEPL_API_KEY
  if (!key) return { error: 'DEEPL_API_KEY ausente' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      return { error: `DeepL respondeu ${res.status}` }
    }

    const data = (await res.json()) as {
      translations?: { text: string }[]
    }
    const translation = data.translations?.[0]?.text
    if (!translation) return { error: 'Resposta inesperada do DeepL' }
    return { translation }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { error: 'Tempo esgotado ao contatar o DeepL' }
    }
    return { error: 'Falha de rede ao contatar o DeepL' }
  } finally {
    clearTimeout(timeout)
  }
}
