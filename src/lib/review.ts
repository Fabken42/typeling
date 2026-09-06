import type mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import TermModel, { type ITerm } from '@/models/Term'
import ReviewLogModel from '@/models/ReviewLog'
import SettingsModel from '@/models/Settings'
import { DEFAULT_SETTINGS } from '@/lib/settingsDefaults'
import { dayStart } from '@/lib/utils'
import { isLanguageCode } from '@/lib/languages'

const STATE_NEW = 0

export interface QueueFilters {
  lang?: string | null
  doc?: string | null
}

function baseFilter(
  userId: mongoose.Types.ObjectId,
  filters: QueueFilters,
): Record<string, unknown> {
  const f: Record<string, unknown> = { userId, suspended: false }
  if (filters.lang && isLanguageCode(filters.lang)) f.language = filters.lang
  if (filters.doc) f.documentId = filters.doc
  return f
}

/** How many new / review cards were already done since the 04:00 rollover. */
async function doneToday(userId: mongoose.Types.ObjectId, now: Date) {
  const since = dayStart(now)
  const logs = await ReviewLogModel.find(
    { userId, review: { $gte: since } },
    { state: 1 },
  ).lean()
  let newDone = 0
  let reviewDone = 0
  for (const l of logs) {
    if (l.state === STATE_NEW) newDone++
    else reviewDone++
  }
  return { newDone, reviewDone }
}

/** Spread new cards through the due list so they aren't all at the end. */
function interleave(due: ITerm[], fresh: ITerm[]): ITerm[] {
  if (fresh.length === 0) return due
  if (due.length === 0) return fresh
  const out: ITerm[] = []
  const gap = Math.max(1, Math.floor(due.length / (fresh.length + 1)))
  let di = 0
  let fi = 0
  let sinceNew = 0
  while (di < due.length || fi < fresh.length) {
    if (di < due.length) {
      out.push(due[di++])
      sinceNew++
    }
    if (fi < fresh.length && (sinceNew >= gap || di >= due.length)) {
      out.push(fresh[fi++])
      sinceNew = 0
    }
  }
  return out
}

export interface QueueResult {
  queue: ITerm[]
  counts: {
    due: number // due right now (ignores limits) — for the nav badge
    newAvailable: number
    remainingNew: number
    remainingReview: number
    queued: number
  }
  nextDue: Date | null
}

export async function buildQueue(
  userId: mongoose.Types.ObjectId,
  filters: QueueFilters,
  now: Date = new Date(),
): Promise<QueueResult> {
  await dbConnect()

  const settings =
    (await SettingsModel.findOne({ userId }).lean()) ?? DEFAULT_SETTINGS
  const dailyNewLimit = settings.dailyNewLimit ?? DEFAULT_SETTINGS.dailyNewLimit
  const dailyReviewLimit =
    settings.dailyReviewLimit ?? DEFAULT_SETTINGS.dailyReviewLimit

  const base = baseFilter(userId, filters)
  const { newDone, reviewDone } = await doneToday(userId, now)
  const remainingNew = Math.max(0, dailyNewLimit - newDone)
  const remainingReview = Math.max(0, dailyReviewLimit - reviewDone)

  // Due (learning/review/relearning) cards whose time has come.
  const dueFilter = {
    ...base,
    'fsrs.state': { $ne: STATE_NEW },
    'fsrs.due': { $lte: now },
  }
  const dueCount = await TermModel.countDocuments(dueFilter)
  const due = (await TermModel.find(dueFilter)
    .sort({ 'fsrs.due': 1 })
    .limit(remainingReview)
    .lean()) as unknown as ITerm[]

  // New cards, oldest first.
  const newFilter = { ...base, 'fsrs.state': STATE_NEW }
  const newAvailable = await TermModel.countDocuments(newFilter)
  const fresh = (await TermModel.find(newFilter)
    .sort({ createdAt: 1 })
    .limit(remainingNew)
    .lean()) as unknown as ITerm[]

  const queue = interleave(due, fresh)

  // Next due date when nothing is available now (for the empty state).
  let nextDue: Date | null = null
  if (queue.length === 0) {
    const upcoming = await TermModel.findOne({
      ...base,
      'fsrs.state': { $ne: STATE_NEW },
      'fsrs.due': { $gt: now },
    })
      .sort({ 'fsrs.due': 1 })
      .lean()
    nextDue = upcoming ? new Date((upcoming as unknown as ITerm).fsrs.due) : null
  }

  return {
    queue,
    counts: {
      due: dueCount,
      newAvailable,
      remainingNew,
      remainingReview,
      queued: queue.length,
    },
    nextDue,
  }
}

export interface ReviewStats {
  due: number
  newAvailable: number
  queued: number
  nextDue: string | null
}

/**
 * Lightweight badge counts — uses countDocuments only, never loads card lists
 * (buildQueue is heavier and only needed to actually study). Runs on the nav
 * badge and the stats endpoint, so keeping it cheap speeds up every navigation.
 */
export async function getReviewStats(
  userId: mongoose.Types.ObjectId,
  filters: QueueFilters = {},
  now: Date = new Date(),
): Promise<ReviewStats> {
  await dbConnect()
  const settings =
    (await SettingsModel.findOne({ userId }).lean()) ?? DEFAULT_SETTINGS
  const base = baseFilter(userId, filters)
  const { newDone, reviewDone } = await doneToday(userId, now)
  const remainingNew = Math.max(
    0,
    (settings.dailyNewLimit ?? DEFAULT_SETTINGS.dailyNewLimit) - newDone,
  )
  const remainingReview = Math.max(
    0,
    (settings.dailyReviewLimit ?? DEFAULT_SETTINGS.dailyReviewLimit) - reviewDone,
  )

  const [due, newAvailable] = await Promise.all([
    TermModel.countDocuments({
      ...base,
      'fsrs.state': { $ne: STATE_NEW },
      'fsrs.due': { $lte: now },
    }),
    TermModel.countDocuments({ ...base, 'fsrs.state': STATE_NEW }),
  ])
  const queued = Math.min(due, remainingReview) + Math.min(newAvailable, remainingNew)

  let nextDue: string | null = null
  if (queued === 0) {
    const upcoming = await TermModel.findOne(
      { ...base, 'fsrs.state': { $ne: STATE_NEW }, 'fsrs.due': { $gt: now } },
      { 'fsrs.due': 1 },
    )
      .sort({ 'fsrs.due': 1 })
      .lean()
    nextDue = upcoming
      ? new Date((upcoming as unknown as ITerm).fsrs.due).toISOString()
      : null
  }

  return { due, newAvailable, queued, nextDue }
}
