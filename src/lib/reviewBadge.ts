// Tiny client-only event bus that keeps the nav "Revisar" badge in sync without
// refetching /api/review/stats on every navigation. The review flow emits cheap
// updates (adjust/set) as the user studies, plus an authoritative refresh on
// focus. Listeners are only ever registered/emitted from client effects and
// handlers, so the module-level Set is never touched during SSR.

export type BadgeEvent =
  | { type: 'refresh' } // ask the header to refetch the authoritative count
  | { type: 'adjust'; delta: number } // optimistic +/- (e.g. a card was rated)
  | { type: 'set'; value: number } // exact known count (e.g. a fresh queue load)

type Listener = (e: BadgeEvent) => void

const listeners = new Set<Listener>()

export function subscribeReviewBadge(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(e: BadgeEvent) {
  listeners.forEach((l) => l(e))
}

export const refreshReviewBadge = () => emit({ type: 'refresh' })
export const adjustReviewBadge = (delta: number) => emit({ type: 'adjust', delta })
export const setReviewBadge = (value: number) => emit({ type: 'set', value })
