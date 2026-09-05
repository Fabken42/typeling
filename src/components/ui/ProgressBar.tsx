import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0..1
  className?: string
  barClassName?: string
}

export function ProgressBar({ value, className, barClassName }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-surface-2',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-emerald-500 transition-[width] duration-300',
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
