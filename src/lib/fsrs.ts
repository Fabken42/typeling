import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Card,
  type Grade,
  type RecordLogItem,
} from 'ts-fsrs'
import type { IFsrs } from '@/models/Term'

// Single shared scheduler with fuzz enabled (spec 13.1).
export const scheduler = fsrs(generatorParameters({ enable_fuzz: true }))

export { Rating }

/** A fresh card object to persist whole into Term.fsrs (spec 4.3). */
export function newCard(now: Date = new Date()): IFsrs {
  return createEmptyCard(now) as unknown as IFsrs
}

/** Coerce a stored fsrs sub-object back into a ts-fsrs Card (Date fields). */
export function toCard(f: IFsrs): Card {
  return {
    ...f,
    due: new Date(f.due),
    last_review: f.last_review ? new Date(f.last_review) : undefined,
  } as unknown as Card
}

export interface RatingPreview {
  rating: number
  card: IFsrs
  scheduledDays: number
  due: Date
}

/**
 * The four scheduling scenarios at once (spec 13.1), used to show the predicted
 * interval above each button.
 */
export function previewIntervals(f: IFsrs, now: Date = new Date()): RatingPreview[] {
  const card = toCard(f)
  const record = scheduler.repeat(card, now)
  const ratings: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
  return ratings.map((rating) => {
    const item = record[rating] as RecordLogItem
    return {
      rating: rating as number,
      card: item.card as unknown as IFsrs,
      scheduledDays: item.card.scheduled_days,
      due: item.card.due,
    }
  })
}

/** Apply a rating, returning the next card and the review log. */
export function applyRating(f: IFsrs, rating: number, now: Date = new Date()) {
  const card = toCard(f)
  const { card: nextCard, log } = scheduler.next(card, now, rating as Grade)
  return {
    card: nextCard as unknown as IFsrs,
    log,
  }
}

/** Human-readable interval label (10 min, 1 d, 4 d, 9 mo …). */
export function formatInterval(f: IFsrs, now: Date = new Date()): string {
  const ms = new Date(f.due).getTime() - now.getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return '<1 min'
  if (mins < 60) return `${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''}`
  const years = Math.round(months / 12)
  return `${years} ano${years > 1 ? 's' : ''}`
}
