import { NextResponse } from 'next/server'
import { UnauthorizedError } from '@/lib/session'

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Wraps a handler, turning UnauthorizedError into 401 and unknown into 500. */
export function withErrors(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch((err) => {
    if (err instanceof UnauthorizedError) {
      return errorJson('Não autenticado', 401)
    }
    console.error(err)
    return errorJson('Erro interno do servidor', 500)
  })
}
