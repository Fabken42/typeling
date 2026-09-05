'use client'

import { create } from 'zustand'
import { api } from '@/lib/client'
import type { TermDTO } from '@/lib/serialize'

export interface QueueCounts {
  due: number
  newAvailable: number
  remainingNew: number
  remainingReview: number
  queued: number
}

interface ReviewState {
  queue: TermDTO[]
  index: number
  revealed: boolean
  counts: QueueCounts | null
  nextDue: string | null
  loading: boolean
  loaded: boolean
  ratings: Record<number, number> // 1..4 tallies
  startedAt: number

  load: (query: string) => Promise<void>
  reveal: () => void
  advance: (rating: number) => void
  skipCurrent: () => void
  updateCurrent: (term: TermDTO) => void
  hydrate: (data: { queue: TermDTO[]; counts: QueueCounts; nextDue: string | null }) => void
  reset: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  queue: [],
  index: 0,
  revealed: false,
  counts: null,
  nextDue: null,
  loading: false,
  loaded: false,
  ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
  startedAt: Date.now(),

  load: async (query) => {
    set({ loading: true })
    try {
      const data = await api.get<{
        queue: TermDTO[]
        counts: QueueCounts
        nextDue: string | null
      }>(`/api/review/queue${query ? `?${query}` : ''}`)
      set({
        queue: data.queue,
        counts: data.counts,
        nextDue: data.nextDue,
        index: 0,
        revealed: false,
        loaded: true,
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
        startedAt: Date.now(),
      })
    } finally {
      set({ loading: false })
    }
  },

  // Seed from server-rendered data (skips the initial client fetch).
  hydrate: (data) =>
    set({
      queue: data.queue,
      counts: data.counts,
      nextDue: data.nextDue,
      index: 0,
      revealed: false,
      loaded: true,
      loading: false,
      ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
      startedAt: Date.now(),
    }),

  reveal: () => set({ revealed: true }),

  advance: (rating) => {
    const s = get()
    set({
      ratings: { ...s.ratings, [rating]: (s.ratings[rating] ?? 0) + 1 },
      index: s.index + 1,
      revealed: false,
    })
  },

  skipCurrent: () => {
    const s = get()
    // Remove the current card from the queue without counting a rating.
    const queue = s.queue.filter((_, i) => i !== s.index)
    set({ queue, revealed: false })
  },

  updateCurrent: (term) => {
    const s = get()
    const queue = [...s.queue]
    if (queue[s.index]) queue[s.index] = term
    set({ queue })
  },

  reset: () =>
    set({
      queue: [],
      index: 0,
      revealed: false,
      loaded: false,
      counts: null,
      nextDue: null,
      ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
    }),
}))
