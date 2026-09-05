import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * The day boundary is 04:00 in the user's local time (spec 13.2), like Anki.
 * Returns the UTC Date for "the current study day's 04:00 start".
 */
export function dayStart(now: Date = new Date()): Date {
  const d = new Date(now)
  const start = new Date(d)
  start.setHours(4, 0, 0, 0)
  if (d.getTime() < start.getTime()) {
    // Before 04:00 → the study day started yesterday at 04:00.
    start.setDate(start.getDate() - 1)
  }
  return start
}

export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `há ${weeks} semana${weeks > 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  if (months < 12) return `há ${months} ${months > 1 ? 'meses' : 'mês'}`
  const years = Math.round(days / 365)
  return `há ${years} ano${years > 1 ? 's' : ''}`
}

export function dueLabel(due: Date | string, state: number): string {
  if (state === 0) return 'novo'
  const d = typeof due === 'string' ? new Date(due) : due
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return 'hoje'
  const days = Math.ceil(diff / 86400000)
  if (days === 1) return 'amanhã'
  if (days < 30) return `em ${days} dias`
  const months = Math.round(days / 30)
  return `em ${months} ${months > 1 ? 'meses' : 'mês'}`
}
