import { langInfo } from '@/lib/languages'
import { cn } from '@/lib/utils'

interface LanguageBadgeProps {
  language: string
  showName?: boolean
  className?: string
}

export function LanguageBadge({
  language,
  showName = false,
  className,
}: LanguageBadgeProps) {
  const info = langInfo(language)
  if (!info) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="text-base leading-none">{info.flag}</span>
      {showName && <span className="text-sm text-muted">{info.name}</span>}
    </span>
  )
}
